import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ── Models ────────────────────────────────────────────────────────────────────

export interface User {
  userId: number;
  name: string;
  role: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  primaryEmail?: string;
}

export interface Job {
  jobId: number;
  userId: number;
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface Social {
  socialId: number;
  userId: number;
  platform: string;
  url: string;
  username?: string;
  verified: boolean;
}

export interface Project {
  projectId: number;
  userId: number;
  title: string;
  description?: string;
  projectType: string;
  status: string;
  startDate?: string;
  endDate?: string;
  githubUrl?: string;
  demoUrl?: string;
  course?: { courseCode: string; courseName: string; semester: string; year: number } | null;
  topics?: { topicId: number; name: string }[];
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Edit mode
  isEditMode = false;
  editName = '';
  editSaving = false;
  editError = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  private authHeaders(): HttpHeaders {
    const provider = sessionStorage.getItem('auth_provider');
    let token: string | null = null;
    if (provider === 'local') {
      token = localStorage.getItem('local_token');
    } else if (provider === 'microsoft') {
      token = this.authService.accessToken;
    } else {
      token = this.authService.idToken || this.authService.accessToken;
    }
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  async loadProfile(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const headers = this.authHeaders();
      this.user = await firstValueFrom(
        this.http.get<User>(`${environment.apiBaseUrl}/api/users/me`, { headers })
      );

      // forkJoin stays inside Angular's zone — catchError returns empty array on 404/error
      const results = await firstValueFrom(
        forkJoin({
          jobs:     this.http.get<Job[]>    (`${environment.apiBaseUrl}/api/users/${this.user.userId}/jobs`,     { headers }).pipe(catchError(() => of([]))),
          socials:  this.http.get<Social[]> (`${environment.apiBaseUrl}/api/users/${this.user.userId}/socials`,  { headers }).pipe(catchError(() => of([]))),
          projects: this.http.get<Project[]>(`${environment.apiBaseUrl}/api/users/${this.user.userId}/projects`, { headers }).pipe(catchError(() => of([]))),
        })
      );
      this.jobs     = results.jobs;
      this.socials  = results.socials;
      this.projects = results.projects;
    } catch (err) {
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

  /** Derive a tech cloud from project topics */
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

  // ── Edit mode ────────────────────────────────────────────────────────────────

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
      const headers = this.authHeaders();

      // Upload image first if one was selected
      if (this.selectedFile) {
        const form = new FormData();
        form.append('file', this.selectedFile);
        const uploadHeaders = new HttpHeaders({
          Authorization: headers.get('Authorization') ?? '',
        });
        await firstValueFrom(
          this.http.post<{ profileImageUrl: string }>(
            `${environment.apiBaseUrl}/api/users/me/profile-image`,
            form,
            { headers: uploadHeaders }
          )
        );
      }

      // Save name (and clear profileImageUrl only if explicitly blanked — we don't touch it here)
      this.user = await firstValueFrom(
        this.http.put<User>(
          `${environment.apiBaseUrl}/api/users/me`,
          { name: this.editName.trim(), profileImageUrl: this.user?.profileImageUrl },
          { headers }
        )
      );

      // Reload so profileImageUrl reflects the new upload
      await this.loadProfile();
      this.closeEdit();
    } catch {
      this.editError = 'Failed to save. Please try again.';
    } finally {
      this.editSaving = false;
    }
  }
}