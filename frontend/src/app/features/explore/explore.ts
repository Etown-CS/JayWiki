import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavComponent } from '../../core/nav/nav';
import { environment } from '../../../environments/environment';

interface ProjectSummary {
  projectId: number;
  userId: number;
  ownerName: string;
  title: string;
  description?: string;
  projectType: string;
  status: string;
  startDate?: string;
  topics: { name: string }[];
}

interface StudentResult {
  userId: number;
  name: string;
  profileImageUrl?: string;
  projectCount: number;
  topics: string[];
}

interface CourseResult {
  catalogId: number;
  courseCode: string;
  courseName: string;
  department?: string;
  credits?: number;
  description?: string;
}

type ResultType = 'all' | 'projects' | 'students' | 'courses';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './explore.html',
})
export class Explore implements OnInit {
  searchTerm           = '';
  public activeTab: ResultType = 'all';
  hasSearched          = false;

  // ── Filters ──────────────────────────────────────────────────────────────
  selectedStatuses: string[] = ['active', 'completed', 'archived'];
  selectedTypes:    string[] = ['academic', 'research', 'club', 'personal'];
  selectedYear: number | null = null;
  availableYears: number[]    = [];

  // ── Data ─────────────────────────────────────────────────────────────────
  private allProjects: ProjectSummary[] = [];
  private allStudents: StudentResult[]  = [];
  private allCourses:  CourseResult[]   = [];

  filteredProjects: ProjectSummary[] = [];
  filteredStudents: StudentResult[]  = [];
  filteredCourses:  CourseResult[]   = [];

  // Populated from GET /api/projects/trending-topics
  trendingTags: string[] = [];

  loading   = true;
  loadError = '';

  readonly tabs: { value: ResultType; label: string }[] = [
    { value: 'all',      label: 'All Results' },
    { value: 'projects', label: 'Projects'    },
    { value: 'students', label: 'Students'    },
    { value: 'courses',  label: 'Courses'     },
  ];

  readonly statuses = ['active', 'completed', 'archived'];
  readonly types    = ['academic', 'research', 'club', 'personal'];

  constructor(
    private http:   HttpClient,
    private router: Router,
    private route:  ActivatedRoute,
    private cdr:    ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAllData();
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) { this.searchTerm = q; this.runSearch(); }
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private async loadAllData(): Promise<void> {
    try {
      const [projects, users, courses, trendingTopics] = await firstValueFrom(
        forkJoin([
          this.http.get<ProjectSummary[]>(`${environment.apiBaseUrl}/api/projects`)
            .pipe(catchError(() => of([] as ProjectSummary[]))),
          this.http.get<any[]>(`${environment.apiBaseUrl}/api/users`)
            .pipe(catchError(() => of([]))),
          this.http.get<CourseResult[]>(`${environment.apiBaseUrl}/api/courses`)
            .pipe(catchError(() => of([] as CourseResult[]))),
          // DB-level aggregation — far more efficient than client-side counting
          this.http.get<string[]>(`${environment.apiBaseUrl}/api/projects/trending-topics?limit=20`)
            .pipe(catchError(() => of([] as string[]))),
        ])
      );

      this.allProjects  = projects;
      this.allCourses   = courses;
      this.trendingTags = trendingTopics;

      // Build student list with topic aggregation
      this.allStudents = users.map((u: any) => {
        const userProjects = projects.filter(p => p.userId === u.userId);
        const allTopics    = userProjects.flatMap(p => p.topics.map(t => t.name));
        const uniqueTopics = [...new Set<string>(allTopics)].slice(0, 6);
        return {
          userId:          u.userId,
          name:            u.name,
          profileImageUrl: u.profileImageUrl,
          projectCount:    userProjects.length,
          topics:          uniqueTopics,
        };
      });

      // Derive available years from project start dates
      const years = projects
        .map(p => p.startDate ? new Date(p.startDate).getFullYear() : null)
        .filter((y): y is number => y !== null);
      this.availableYears = [...new Set(years)].sort((a, b) => b - a);

    } catch {
      this.loadError = 'Failed to load data. Search may be limited.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  runSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
      // Don't run search on empty input
      if (!term) {
        this.hasSearched = false;
        this.cdr.detectChanges();
        return;
      }

      this.hasSearched = true;

    if (!term) {
      this.filteredProjects = [];
      this.filteredStudents = [];
      this.filteredCourses  = [];
      this.cdr.detectChanges();
      return;
    }

    this.filteredProjects = this.allProjects.filter(p => {
      const statusOk = this.selectedStatuses.includes(p.status);
      const typeOk   = this.selectedTypes.includes(p.projectType);
      const yearOk   = this.selectedYear === null
        ? true
        : p.startDate
          ? new Date(p.startDate).getFullYear() === this.selectedYear
          : false;
      const textOk   =
        p.title.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        p.topics.some(t => t.name.toLowerCase().includes(term)) ||
        p.ownerName.toLowerCase().includes(term);
      return statusOk && typeOk && yearOk && textOk;
    });

    this.filteredStudents = this.allStudents.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.topics.some(t => t.toLowerCase().includes(term))
    );

    this.filteredCourses = this.allCourses.filter(c =>
      c.courseCode.toLowerCase().includes(term) ||
      c.courseName.toLowerCase().includes(term) ||
      (c.description ?? '').toLowerCase().includes(term)
    );

    this.cdr.detectChanges();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.runSearch();
  }

  applyTrendingTag(tag: string): void {
    this.searchTerm = tag;
    this.runSearch();
  }

  setTab(value: ResultType): void { this.activeTab = value; }

  // ── Facet toggles ─────────────────────────────────────────────────────────

  toggleStatus(status: string): void {
    this.selectedStatuses = this.selectedStatuses.includes(status)
      ? this.selectedStatuses.filter(s => s !== status)
      : [...this.selectedStatuses, status];
    if (this.hasSearched) this.runSearch();
  }

  toggleType(type: string): void {
    this.selectedTypes = this.selectedTypes.includes(type)
      ? this.selectedTypes.filter(t => t !== type)
      : [...this.selectedTypes, type];
    if (this.hasSearched) this.runSearch();
  }

  selectYear(year: number | null): void {
    this.selectedYear = year;
    if (this.hasSearched) this.runSearch();
  }

  resetFilters(): void {
    this.searchTerm       = '';
    this.hasSearched      = false;
    this.selectedStatuses = ['active', 'completed', 'archived'];
    this.selectedTypes    = ['academic', 'research', 'club', 'personal'];
    this.selectedYear     = null;
    this.filteredProjects = [];
    this.filteredStudents = [];
    this.filteredCourses  = [];
    this.cdr.detectChanges();
  }

  // ── Counts ────────────────────────────────────────────────────────────────

  get totalResults(): number {
    return this.filteredProjects.length + this.filteredStudents.length + this.filteredCourses.length;
  }
  get projectCount(): number { return this.filteredProjects.length; }
  get studentCount(): number { return this.filteredStudents.length; }
  get courseCount():  number { return this.filteredCourses.length;  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goToProject(p: ProjectSummary): void { this.router.navigate(['/projects', p.userId, p.projectId]); }
  goToStudent(s: StudentResult):  void { this.router.navigate(['/students', s.userId]);    }
  goToCourse(c: CourseResult):    void { this.router.navigate(['/courses', c.catalogId]);  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':    return 'text-green-400 bg-green-400/10';
      case 'completed': return 'text-[#4A90C4] bg-[#4A90C4]/10';
      default:          return 'text-white/30 bg-white/5';
    }
  }

  getTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  isStatusChecked(status: string): boolean { return this.selectedStatuses.includes(status); }
  isTypeChecked(type: string):     boolean { return this.selectedTypes.includes(type);      }
  isActiveTab(value: ResultType):  boolean { return this.activeTab === value;                }

  getTabCount(value: ResultType): number {
    switch (value) {
      case 'projects': return this.projectCount;
      case 'students': return this.studentCount;
      case 'courses':  return this.courseCount;
      default:         return this.totalResults;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  highlight(text: string): string {
    const safe = this.escapeHtml(text);
    if (!this.searchTerm.trim()) return safe;
    const escaped = this.searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark class="bg-[#4A90C4]/25 text-[#4A90C4] rounded px-0.5">$1</mark>'
    );
  }
}