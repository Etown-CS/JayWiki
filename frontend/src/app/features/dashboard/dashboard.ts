import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { User, Job, Social, Project } from '../../core/models/models';
import { environment } from '../../../environments/environment';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavComponent } from '../../core/nav/nav';

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  // Data
  user: User | null = null;
  jobs: Job[] = [];
  socials: Social[] = [];
  projects: Project[] = [];

  // UI state
  loading = true;
  error = '';

  // Whether this is the authenticated user viewing their own profile,
  // or an external visitor viewing someone else's public profile.
  isOwnProfile = false;

  // Edit mode (only available on own profile)
  isEditMode = false;
  editName = '';
  editSaving = false;
  editError = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    public authService: AuthService,
    private api: ApiService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    public router: Router,
  ) {}

  ngOnInit(): void {
    // Route /dashboard → no :id param → own profile (auth required).
    // Route /students/:id → has :id param → public profile (no auth needed).
    const routeId = this.route.snapshot.paramMap.get('id');
    this.isOwnProfile = routeId === null;
    this.loadProfile(routeId ? +routeId : null);
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  async loadProfile(userId: number | null): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      let resolvedUserId: number;

      if (this.isOwnProfile) {
        // Authenticated: fetch current user via /me
        const headers = this.api.authHeaders();
        this.user = await firstValueFrom(
          this.http.get<User>(`${environment.apiBaseUrl}/api/users/me`, { headers })
        );
        resolvedUserId = this.user.userId;
      } else {
        // Public: fetch user by ID — public endpoint, no auth needed
        this.user = await firstValueFrom(
          this.http.get<User>(`${environment.apiBaseUrl}/api/users/${userId}`)
        );
        resolvedUserId = this.user.userId;
      }

      // Supporting data — all public endpoints; auth headers only on own profile
      const headers = this.isOwnProfile ? this.api.authHeaders() : undefined;

      const results = await firstValueFrom(
        forkJoin({
          jobs:     this.http.get<Job[]>    (`${environment.apiBaseUrl}/api/users/${resolvedUserId}/jobs`,     { headers }).pipe(catchError(() => of([]))),
          socials:  this.http.get<Social[]> (`${environment.apiBaseUrl}/api/users/${resolvedUserId}/socials`,  { headers }).pipe(catchError(() => of([]))),
          projects: this.http.get<Project[]>(`${environment.apiBaseUrl}/api/users/${resolvedUserId}/projects`, { headers }).pipe(catchError(() => of([]))),
        })
      );
      this.jobs     = results.jobs;
      this.socials  = results.socials;
      this.projects = results.projects;
    } catch {
      this.error = 'Failed to load profile. Please try again.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

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
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  formatDateRange(start?: string, end?: string): string {
    return `${this.formatDate(start)} – ${this.formatDate(end)}`;
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

  getJobDotColor(index: number): string {
    return ['bg-[#2ECC71]', 'bg-[#4A90C4]', 'bg-[#F0C040]', 'bg-[#C8102E]'][index % 4];
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
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  // ── Edit mode (own profile only) ─────────────────────────────────────────────

  openEdit(): void {
    this.editName  = this.user?.name ?? '';
    this.editError = '';
    this.selectedFile = null;
    this.previewUrl = null;
    this.isEditMode = true;
  }

  closeEdit(): void {
    this.isEditMode = false;
    this.previewUrl = null;
    this.selectedFile = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => this.previewUrl = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  async saveProfile(): Promise<void> {
    if (!this.editName.trim()) {
      this.editError = 'Name cannot be empty.';
      return;
    }
    this.editSaving = true;
    this.editError = '';
    try {
      const headers = this.api.authHeaders();

      if (this.selectedFile) {
        const form = new FormData();
        form.append('file', this.selectedFile);
        // For multipart uploads, omit Content-Type so the browser sets the boundary.
        // Only forward the Authorization header from authHeaders().
        const uploadHeaders = headers;
        await firstValueFrom(
          this.http.post<{ profileImageUrl: string }>(
            `${environment.apiBaseUrl}/api/users/me/profile-image`,
            form,
            { headers: uploadHeaders }
          )
        );
      }

      this.user = await firstValueFrom(
        this.http.put<User>(
          `${environment.apiBaseUrl}/api/users/me`,
          { name: this.editName.trim(), profileImageUrl: this.user?.profileImageUrl },
          { headers }
        )
      );

      await this.loadProfile(null);
      this.closeEdit();
    } catch {
      this.editError = 'Failed to save. Please try again.';
    } finally {
      this.editSaving = false;
    }
  }
}