import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { Project, User, Award, EventSummary } from '../../core/models/models';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, NavComponent, RouterLink],
  templateUrl: './project-detail.html',
})
export class ProjectDetail implements OnInit {
  project:     Project      | null = null;
  owner:       User         | null = null;
  ownerAwards: Award[]             = [];
  ownerEvents: EventSummary[]      = [];
  loading      = true;
  error        = '';
  isOwnProject = false;

  constructor(
    private http:        HttpClient,
    private api:         ApiService,
    private authService: AuthService,
    private route:       ActivatedRoute,
    private router:      Router,
    private cdr:         ChangeDetectorRef,
    private location:    Location,
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const projectId   = +this.route.snapshot.paramMap.get('projectId')!;
    const routeUserId = this.route.snapshot.paramMap.get('userId');
    this.isOwnProject = routeUserId === null;
    this.load(projectId, routeUserId ? +routeUserId : null);
  }

  async load(projectId: number, routeUserId: number | null): Promise<void> {
    this.loading = true;
    try {
      let userId: number;

      if (this.isOwnProject) {
        const headers = this.api.authHeaders();
        const me = await firstValueFrom(
          this.http.get<{ userId: number }>(`${environment.apiBaseUrl}/api/users/me`, { headers })
        );
        userId = me.userId;
        this.project = await firstValueFrom(
          this.http.get<Project>(
            `${environment.apiBaseUrl}/api/users/${userId}/projects/${projectId}`,
            { headers }
          )
        );
      } else {
        userId = routeUserId!;
        this.project = await firstValueFrom(
          this.http.get<Project>(
            `${environment.apiBaseUrl}/api/users/${userId}/projects/${projectId}`
          )
        );
      }

      // Fetch owner profile, awards, and events in parallel
      const [ownerData, awardsData, eventsData] = await Promise.all([
        firstValueFrom(
          this.http.get<User>(`${environment.apiBaseUrl}/api/users/${userId}`)
        ),
        firstValueFrom(
          this.http.get<Award[]>(`${environment.apiBaseUrl}/api/users/${userId}/awards`)
            .pipe(catchError(() => of([] as Award[])))
        ),
        firstValueFrom(
          this.http.get<EventSummary[]>(`${environment.apiBaseUrl}/api/users/${userId}/events`)
            .pipe(catchError(() => of([] as EventSummary[])))
        ),
      ]);

      this.owner       = ownerData;
      this.ownerAwards = awardsData;
      this.ownerEvents = eventsData;

    } catch {
      this.error = 'Failed to load project.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  navigateToStudent(userId: number): void {
    this.router.navigate(['/students', userId]);
  }

  goBack(): void {
    this.location.back();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  getProjectEmoji(type?: string): string {
    return { academic: '🌐', research: '🔬', club: '🎯', personal: '💡' }[type ?? ''] ?? '📁';
  }

  getStatusClass(status?: string): string {
    return status === 'active'
      ? 'bg-[#2ECC71]/10 text-[#2ECC71] border-[#2ECC71]/20'
      : 'bg-[#4A90C4]/10 text-[#4A90C4] border-[#4A90C4]/20';
  }

  getTopicClass(index: number): string {
    const classes = [
      'bg-[#4A90C4]/10 text-[#4A90C4] border-[#4A90C4]/20',
      'bg-[#C8102E]/10 text-[#FF6B6B] border-[#C8102E]/20',
      'bg-[#2ECC71]/10 text-[#2ECC71] border-[#2ECC71]/20',
      'bg-[#F0C040]/10 text-[#F0C040] border-[#F0C040]/20',
    ];
    return classes[index % classes.length];
  }

  getCategoryClass(cat: string): string {
    const map: Record<string, string> = {
      academic: 'bg-[#4A90C4]/15 text-[#4A90C4]',
      club:     'bg-[#2ECC71]/15 text-[#2ECC71]',
      sport:    'bg-[#F0C040]/15 text-[#F0C040]',
      other:    'bg-white/10 text-white/60',
    };
    return map[cat] ?? map['other'];
  }

  getMediaIcon(type: string): string {
    return { image: '🖼', video: '▶️', link: '🔗' }[type] ?? '📎';
  }

  formatDate(d?: string): string {
    if (!d) return 'Present';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}