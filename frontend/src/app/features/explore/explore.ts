// frontend/src/app/features/explore/explore.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavComponent } from '../../core/nav/nav';
import { environment } from '../../../environments/environment';

interface UserSummary {
  userId: number;
  name: string;
  profileImageUrl?: string;
}

interface ProjectResult {
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
  // Search state
  searchTerm          = '';
  public activeTab: ResultType = 'all';
  hasSearched         = false;

  // Filter state
  selectedStatuses: string[] = ['active', 'completed', 'archived'];
  selectedTypes:    string[] = ['academic', 'research', 'club', 'personal'];

  // Raw data
  private allProjects: ProjectResult[] = [];
  private allStudents: StudentResult[] = [];
  private allCourses:  CourseResult[]  = [];

  // Filtered results
  filteredProjects: ProjectResult[] = [];
  filteredStudents: StudentResult[] = [];
  filteredCourses:  CourseResult[]  = [];

  loading   = true;
  loadError = '';

  readonly tabs: { value: ResultType; label: string }[] = [
    { value: 'all',      label: 'All Results' },
    { value: 'projects', label: 'Projects'    },
    { value: 'students', label: 'Students'    },
    { value: 'courses',  label: 'Courses'     },
  ];

  readonly trendingTags = [
    'Angular', 'C# / .NET', 'Azure', 'Python', 'React',
    'Machine Learning', 'TypeScript', 'Docker', 'PostgreSQL',
    'Node.js', 'Java', 'Rust', 'IoT', 'TensorFlow',
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

    // Support ?q= in URL
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.searchTerm = q;
      this.runSearch();
    }
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  private async loadAllData(): Promise<void> {
    try {
      const [users, courses] = await firstValueFrom(
        forkJoin([
          this.http.get<UserSummary[]>(`${environment.apiBaseUrl}/api/users`),
          this.http.get<CourseResult[]>(`${environment.apiBaseUrl}/api/courses`)
            .pipe(catchError(() => of([] as CourseResult[]))),
        ])
      );

      this.allCourses = courses;

      // Fetch each user's projects in parallel (best-effort)
      const projectSets = await Promise.allSettled(
        users.map(u =>
          firstValueFrom(
            this.http.get<any[]>(`${environment.apiBaseUrl}/api/users/${u.userId}/projects`)
              .pipe(catchError(() => of([])))
          ).then(projects => ({ user: u, projects }))
        )
      );

      const projectList: ProjectResult[] = [];
      const studentList: StudentResult[] = [];

      for (const result of projectSets) {
        if (result.status !== 'fulfilled') continue;
        const { user, projects } = result.value;

        const allTopics = projects.flatMap((p: any) =>
          (p.topics ?? []).map((t: any) => t.name as string)
        );
        const uniqueTopics = [...new Set<string>(allTopics)].slice(0, 6);

        studentList.push({
          userId:          user.userId,
          name:            user.name,
          profileImageUrl: user.profileImageUrl,
          projectCount:    projects.length,
          topics:          uniqueTopics,
        });

        for (const p of projects) {
          projectList.push({
            projectId:   p.projectId,
            userId:      user.userId,
            ownerName:   user.name,
            title:       p.title,
            description: p.description,
            projectType: p.projectType ?? 'academic',
            status:      p.status      ?? 'active',
            startDate:   p.startDate,
            topics:      p.topics      ?? [],
          });
        }
      }

      this.allProjects = projectList;
      this.allStudents = studentList;
    } catch {
      this.loadError = 'Failed to load data. Search may be limited.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  runSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.hasSearched = true;

    if (!term) {
      this.filteredProjects = [];
      this.filteredStudents = [];
      this.filteredCourses  = [];
      this.cdr.detectChanges();
      return;
    }

    this.filteredProjects = this.allProjects.filter(p =>
      this.selectedStatuses.includes(p.status) &&
      this.selectedTypes.includes(p.projectType) &&
      (
        p.title.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        p.topics.some(t => t.name.toLowerCase().includes(term)) ||
        p.ownerName.toLowerCase().includes(term)
      )
    );

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

  setTab(value: ResultType): void {
    this.activeTab = value;
  }

  // ── Facet toggles ───────────────────────────────────────────────────────────

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

  // ── Counts ──────────────────────────────────────────────────────────────────

  get totalResults(): number {
    return this.filteredProjects.length + this.filteredStudents.length + this.filteredCourses.length;
  }

  get projectCount(): number { return this.filteredProjects.length; }
  get studentCount(): number { return this.filteredStudents.length; }
  get courseCount():  number { return this.filteredCourses.length;  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  goToProject(p: ProjectResult): void {
    this.router.navigate(['/projects', p.projectId]);
  }

  goToStudent(s: StudentResult): void {
    this.router.navigate(['/students', s.userId]);
  }

  goToCourse(c: CourseResult): void {
    this.router.navigate(['/courses', c.catalogId]);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

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

  highlight(text: string): string {
    if (!this.searchTerm.trim()) return text;
    const escaped = this.searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark class="bg-[#4A90C4]/25 text-[#4A90C4] rounded px-0.5">$1</mark>'
    );
  }

  isStatusChecked(status: string): boolean {
    return this.selectedStatuses.includes(status);
  }

  isTypeChecked(type: string): boolean {
    return this.selectedTypes.includes(type);
  }

  isActiveTab(value: ResultType): boolean {
    return this.activeTab === value;
  }

  getTabCount(value: ResultType): number {
    switch (value) {
      case 'projects': return this.projectCount;
      case 'students': return this.studentCount;
      case 'courses':  return this.courseCount;
      default:         return this.totalResults;
    }
  }
}