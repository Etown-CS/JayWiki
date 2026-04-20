// frontend/src/app/features/dashboard/dashboard.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { User, Social, Project, CourseEnrollment, EventSummary, Award } from '../../core/models/models';
import { environment } from '../../../environments/environment';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavComponent } from '../../core/nav/nav';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  // ── Data ──────────────────────────────────────────────────────────────────
  user:     User             | null = null;
  socials:  Social[]                = [];
  projects: Project[]               = [];
  courses:  CourseEnrollment[]      = [];
  events:   EventSummary[]          = [];
  awards: Award[] = [];

  // ── UI state ──────────────────────────────────────────────────────────────
  loading = true;
  error   = '';

  // /dashboard       → own profile (auth-guarded)
  // /students/:id    → public profile (no guard)
  isOwnProfile = false;

  // Edit modal — own profile only
  isEditMode   = false;
  editName     = '';
  editSaving   = false;
  editError    = '';
  selectedFile: File   | null = null;
  previewUrl:   string | null = null;

  constructor(
    public  authService: AuthService,
    private api:         ApiService,
    private http:        HttpClient,
    private cdr:         ChangeDetectorRef,
    private route:       ActivatedRoute,
    public  router:      Router,
  ) {}

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    this.isOwnProfile = routeId === null;
    this.loadProfile(routeId ? +routeId : null);
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  async loadProfile(userId: number | null): Promise<void> {
    this.loading = true;
    this.error   = '';
    try {
      let resolvedId: number;

      if (this.isOwnProfile) {
        const headers = this.api.authHeaders();
        this.user  = await firstValueFrom(
          this.http.get<User>(`${environment.apiBaseUrl}/api/users/me`, { headers })
        );
        resolvedId = this.user.userId;

        // Populate shared nav state.
        // OAuth users: already set by upsertUser() after login.
        // Local-auth users: upsertUser() never runs, so this is the only call-site.
        this.authService.setCurrentUser(this.user);

      } else {
        this.user  = await firstValueFrom(
          this.http.get<User>(`${environment.apiBaseUrl}/api/users/${userId}`)
        );
        resolvedId = this.user.userId;
      }

      const headers = this.isOwnProfile ? this.api.authHeaders() : undefined;
      const base    = `${environment.apiBaseUrl}/api/users/${resolvedId}`;

      const results = await firstValueFrom(
        forkJoin({
          socials:  this.http.get<Social[]>         (`${base}/socials`,  { headers }).pipe(catchError(() => of([]))),
          projects: this.http.get<Project[]>        (`${base}/projects`, { headers }).pipe(catchError(() => of([]))),
          courses:  this.http.get<CourseEnrollment[]>(`${base}/courses`, { headers }).pipe(catchError(() => of([]))),
          events:   this.http.get<EventSummary[]>   (`${base}/events`,  { headers }).pipe(catchError(() => of([]))),
          awards: this.http.get<Award[]>(`${base}/awards`, { headers }).pipe(catchError(() => of([]))),
        })
      );
      this.socials  = results.socials;
      this.projects = results.projects;
      this.courses  = results.courses;
      this.events   = results.events;
      this.awards   = results.awards;

    } catch {
      this.error = 'Failed to load profile. Please try again.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Edit modal ────────────────────────────────────────────────────────────

  openEdit(): void {
    this.editName     = this.user?.name ?? '';
    this.editError    = '';
    this.selectedFile = null;
    this.previewUrl   = null;
    this.isEditMode   = true;
  }

  closeEdit(): void {
    this.isEditMode   = false;
    this.previewUrl   = null;
    this.selectedFile = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => (this.previewUrl = e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async saveProfile(): Promise<void> {
    if (!this.editName.trim()) {
      this.editError = 'Name cannot be empty.';
      return;
    }
    this.editSaving = true;
    this.editError  = '';
    try {
      const headers = this.api.authHeaders();

      // Upload new photo first if one was selected.
      if (this.selectedFile) {
        const form = new FormData();
        form.append('file', this.selectedFile);
        // Pass only Authorization — browser sets Content-Type + boundary for multipart.
        const uploadResult = await firstValueFrom(
          this.http.post<{ profileImageUrl: string }>(
            `${environment.apiBaseUrl}/api/users/me/profile-image`,
            form,
            { headers }
          )
        );
        if (this.user) {
          this.user = { ...this.user, profileImageUrl: uploadResult.profileImageUrl };
        }
      }

      // Persist updated name.
      this.user = await firstValueFrom(
        this.http.put<User>(
          `${environment.apiBaseUrl}/api/users/me`,
          { name: this.editName.trim() },
          { headers }
        )
      );

      // Update nav avatar immediately — before the loadProfile() reload completes.
      if (this.user) {
        this.authService.setCurrentUser(this.user);
      }

      await this.loadProfile(null);
      this.closeEdit();

    } catch {
      this.editError = 'Failed to save. Please try again.';
    } finally {
      this.editSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getUserInitials(): string {
    if (!this.user?.name) return '?';
    return this.user.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'Present';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  formatDateRange(start?: string, end?: string): string {
    return `${this.formatDate(start)} – ${this.formatDate(end)}`;
  }

  isUpcoming(dateStr: string): boolean {
    return new Date(dateStr) > new Date();
  }

  getSocialIcon(platform: string): string {
    const icons: Record<string, string> = {
      github: '🐙', linkedin: '💼', website: '🌐',
      twitter: '🐦', instagram: '📸', youtube: '▶️',
    };
    return icons[platform.toLowerCase()] ?? '🔗';
  }

  getStatusClass(status: string): string {
    return status === 'active'
      ? 'bg-[#2ECC71]/10 text-[#2ECC71]'
      : status === 'completed'
        ? 'bg-[#4A90C4]/10 text-[#4A90C4]'
        : 'bg-white/5 text-[#7A9BBF]';
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

  get techTopics(): { name: string; hot: boolean }[] {
    const freq = new Map<string, number>();
    for (const p of this.projects) {
      for (const t of p.topics ?? []) {
        freq.set(t.name, (freq.get(t.name) ?? 0) + 1);
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, hot: count > 1 }));
  }

  goToMyPortfolio(): void {
    this.authService.isLoggedIn
      ? this.router.navigate(['/dashboard'])
      : this.router.navigate(['/login']);
  }
}