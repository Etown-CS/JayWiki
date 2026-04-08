// frontend/src/app/features/my-projects/my-projects.ts
// B — Authenticated user's full project list at /dashboard/projects

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { Project } from '../../core/models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [CommonModule, NavComponent],
  templateUrl: './my-projects.html',
})
export class MyProjects implements OnInit {
  projects: Project[] = [];
  loading = true;
  error = '';
  userId: number | null = null;

  activeTypeFilter = 'all';
  activeStatusFilter = 'all';
  viewMode: 'grid' | 'list' = 'grid';

  readonly typeFilters = ['all', 'academic', 'research', 'club', 'personal'];
  readonly statusFilters = ['all', 'active', 'completed', 'archived'];

  constructor(
    private http: HttpClient,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading = true;
    try {
      const headers = this.api.authHeaders();
      const me = await firstValueFrom(
        this.http.get<{ userId: number }>(`${environment.apiBaseUrl}/api/users/me`, { headers })
      );
      this.userId = me.userId;
      this.projects = await firstValueFrom(
        this.http.get<Project[]>(
          `${environment.apiBaseUrl}/api/users/${me.userId}/projects`, { headers }
        )
      );
    } catch {
      this.error = 'Failed to load projects.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  get filteredProjects(): Project[] {
    let list = [...this.projects];
    if (this.activeTypeFilter !== 'all')
      list = list.filter(p => p.projectType === this.activeTypeFilter);
    if (this.activeStatusFilter !== 'all')
      list = list.filter(p => p.status === this.activeStatusFilter);
    return list.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
  }

  openProject(p: Project): void {
    this.router.navigate(['/dashboard/projects', p.projectId]);
  }

  getProjectEmoji(type: string): string {
    return { academic: '🌐', research: '🔬', club: '🎯', personal: '💡' }[type] ?? '📁';
  }

  getBannerGradient(type: string): string {
    const map: Record<string, string> = {
      academic: 'linear-gradient(135deg,rgba(74,144,196,0.18),rgba(13,27,46,0.85))',
      research: 'linear-gradient(135deg,rgba(46,204,113,0.15),rgba(13,27,46,0.85))',
      club:     'linear-gradient(135deg,rgba(155,89,182,0.15),rgba(13,27,46,0.85))',
      personal: 'linear-gradient(135deg,rgba(240,192,64,0.13),rgba(13,27,46,0.85))',
    };
    return map[type] ?? map['academic'];
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'bg-[#2ECC71]/10 text-[#2ECC71]' : 'bg-[#4A90C4]/10 text-[#4A90C4]';
  }

  formatDate(d?: string): string {
    if (!d) return 'Present';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}