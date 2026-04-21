// All projects from all students.
// TODO: Replace with a dedicated GET /api/projects endpoint once it exists.
//       Current approach fans out N+1 from GET /api/users — not suitable for production scale.

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { Project, User } from '../../core/models/models';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface GalleryProject extends Project {
  studentName: string;
  studentInitials: string;
  studentId: number;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './projects.html',
})
export class Projects implements OnInit {
  projects: GalleryProject[] = [];
  loading = true;
  error = '';

  searchTerm = '';
  activeTypeFilter = 'all';
  activeStatusFilter = 'all';
  sortMode = 'newest';
  viewMode: 'grid' | 'list' = 'grid';

  readonly typeFilters = ['all', 'academic', 'research', 'club', 'personal'];
  readonly statusFilters = ['all', 'active', 'completed'];

  constructor(
    private http: HttpClient,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  async loadProjects(): Promise<void> {
    this.loading = true;
    try {
      const users = await firstValueFrom(
        this.http.get<User[]>(`${environment.apiBaseUrl}/api/users`)
      );

      const projectArrays = await firstValueFrom(
        forkJoin(
          users.map(u =>
            this.http
              .get<Project[]>(`${environment.apiBaseUrl}/api/users/${u.userId}/projects`)
              .pipe(catchError(() => of([] as Project[])))
          )
        )
      );

      this.projects = projectArrays.flatMap((projs, i) =>
        projs.map(p => ({
          ...p,
          studentId: users[i].userId,
          studentName: users[i].name,
          studentInitials: users[i].name
            .split(' ').filter(Boolean).slice(0, 2)
            .map(w => w[0].toUpperCase()).join(''),
        }))
      );
    } catch {
      this.error = 'Failed to load projects.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  get filteredProjects(): GalleryProject[] {
    let list = [...this.projects];

    // Search filter — matches title, description, topics, and student name
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      list = list.filter(p =>
        p.title.toLowerCase().includes(term) ||
        (p.description?.toLowerCase().includes(term) ?? false) ||
        p.topics?.some(t => t.name.toLowerCase().includes(term)) ||
        p.studentName.toLowerCase().includes(term)
      );
    }

    // Type / status filters
    if (this.activeTypeFilter !== 'all')
      list = list.filter(p => p.projectType === this.activeTypeFilter);
    if (this.activeStatusFilter !== 'all')
      list = list.filter(p => p.status === this.activeStatusFilter);

    // Sort
    if (this.sortMode === 'newest')
      list.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
    else if (this.sortMode === 'oldest')
      list.sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
    else if (this.sortMode === 'az')
      list.sort((a, b) => a.title.localeCompare(b.title));

    return list;
  }

  get isFiltered(): boolean {
    return this.searchTerm.trim() !== '' ||
           this.activeTypeFilter !== 'all' ||
           this.activeStatusFilter !== 'all';
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.activeTypeFilter = 'all';
    this.activeStatusFilter = 'all';
  }

  setTypeFilter(f: string): void   { this.activeTypeFilter = f; }
  setStatusFilter(f: string): void { this.activeStatusFilter = f; }
  setSort(s: string): void         { this.sortMode = s; }
  setView(v: 'grid' | 'list'): void { this.viewMode = v; }

  openProject(p: GalleryProject): void {
    this.router.navigate(['/gallery', p.studentId, p.projectId]);
  }

  getProjectEmoji(p: GalleryProject): string {
    const map: Record<string, string> = {
      academic: '🌐', research: '🔬', club: '🎯', personal: '💡',
    };
    return map[p.projectType] ?? '📁';
  }

  getBannerGradient(p: GalleryProject): string {
    const map: Record<string, string> = {
      academic: 'linear-gradient(135deg,rgba(74,144,196,0.18),rgba(13,27,46,0.85))',
      research: 'linear-gradient(135deg,rgba(46,204,113,0.15),rgba(13,27,46,0.85))',
      club:     'linear-gradient(135deg,rgba(155,89,182,0.15),rgba(13,27,46,0.85))',
      personal: 'linear-gradient(135deg,rgba(240,192,64,0.13),rgba(13,27,46,0.85))',
    };
    return map[p.projectType] ?? map['academic'];
  }

  getStatusClass(status: string): string {
    return status === 'active'
      ? 'bg-[#2ECC71]/10 text-[#2ECC71] border-[#2ECC71]/20'
      : 'bg-[#4A90C4]/10 text-[#4A90C4] border-[#4A90C4]/20';
  }

  formatDateRange(start?: string, end?: string): string {
    const fmt = (d?: string) => d
      ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Present';
    return `${fmt(start)} – ${fmt(end)}`;
  }
}