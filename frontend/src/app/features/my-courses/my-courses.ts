// frontend/src/app/features/my-courses/my-courses.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { CourseEnrollment, CourseCatalog } from '../../core/models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavComponent],
  templateUrl: './my-courses.html',
})
export class MyCourses implements OnInit {

  courses:  CourseEnrollment[] = [];
  loading   = true;
  error     = '';
  userId: number | null = null;

  readonly semesterOrder: Record<string, number> = { Spring: 1, Summer: 2, Fall: 3, 'Fall/Spring': 4 };

  // ── Add Course modal ──────────────────────────────────────────────────────
  showAddModal   = false;
  catalog:       CourseCatalog[] = [];
  catalogLoading = false;
  catalogSearch  = '';

  enrollForm     = { catalogId: null as number | null, semester: 'Fall', year: new Date().getFullYear(), instructor: '' };
  enrollSaving   = false;
  enrollError    = '';

  readonly semesters = ['Fall', 'Spring', 'Summer', 'Fall/Spring'];
  readonly years: number[] = Array.from(
    { length: new Date().getFullYear() - 1980 + 1 },
    (_, i) => new Date().getFullYear() - i
  );

  constructor(
    private http:        HttpClient,
    private api:         ApiService,
    private authService: AuthService,
    private router:      Router,
    private cdr:         ChangeDetectorRef,
    private location: Location,
  ) {}

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading = true;
    try {
      const headers = this.api.authHeaders();
      const me = await firstValueFrom(
        this.http.get<{ userId: number }>(`${environment.apiBaseUrl}/api/users/me`, { headers })
      );
      this.userId  = me.userId;
      this.courses = await firstValueFrom(
        this.http.get<CourseEnrollment[]>(
          `${environment.apiBaseUrl}/api/users/${me.userId}/courses`, { headers }
        )
      );
    } catch {
      this.error = 'Failed to load courses.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Add Course modal ──────────────────────────────────────────────────────

  async openAddModal(): Promise<void> {
    this.showAddModal  = true;
    this.catalogSearch = '';
    this.enrollForm    = { catalogId: null, semester: 'Fall', year: new Date().getFullYear(), instructor: '' };
    this.enrollError   = '';
    this.catalogLoading = true;
    this.cdr.detectChanges();
    try {
      const allCourses = await firstValueFrom(
        this.http.get<CourseCatalog[]>(`${environment.apiBaseUrl}/api/courses`)
      );
      // Filter out courses the student is already enrolled in (any semester)
      const enrolledCatalogIds = new Set(this.courses.map(c => c.catalogId));
      this.catalog = allCourses.filter(c => !enrolledCatalogIds.has(c.catalogId));
    } catch {
      this.enrollError = 'Failed to load course catalog.';
    } finally {
      this.catalogLoading = false;
      this.cdr.detectChanges();
    }
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.enrollError  = '';
  }

  get filteredCatalog(): CourseCatalog[] {
    if (!this.catalogSearch.trim()) return this.catalog;
    const t = this.catalogSearch.trim().toLowerCase();
    return this.catalog.filter(c =>
      c.courseCode.toLowerCase().includes(t) ||
      c.courseName.toLowerCase().includes(t) ||
      (c.department ?? '').toLowerCase().includes(t)
    );
  }

  selectCourse(catalogId: number): void {
    this.enrollForm.catalogId = catalogId;
  }

  async enroll(): Promise<void> {
    if (!this.enrollForm.catalogId || !this.userId) {
      this.enrollError = 'Please select a course.';
      return;
    }
    this.enrollSaving = true;
    this.enrollError  = '';

    try {
      // Frontend duplicate check — same course + semester + year
      const duplicate = this.courses.some(c =>
        c.catalogId       === this.enrollForm.catalogId &&
        c.semester        === this.enrollForm.semester  &&
        c.year            === this.enrollForm.year
      );
      if (duplicate) {
        const course = this.catalog.find(c => c.catalogId === this.enrollForm.catalogId);
        this.enrollError = `You are already enrolled in ${course?.courseCode ?? 'this course'} for ${this.enrollForm.semester} ${this.enrollForm.year}.`;
        this.enrollSaving = false;
        return;
      }

      await firstValueFrom(
        this.http.post(
          `${environment.apiBaseUrl}/api/users/${this.userId}/courses`,
          {
            catalogId:  this.enrollForm.catalogId,
            semester:   this.enrollForm.semester,
            year:       this.enrollForm.year,
            instructor: this.enrollForm.instructor.trim() || null,
          },
          { headers: this.api.authHeaders() }
        )
      );

      await this.load();
      this.closeAddModal();

    } catch (err: any) {
      this.enrollError = err?.error?.message ?? 'Failed to enroll. Please try again.';
    } finally {
      this.enrollSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get sortedCourses(): CourseEnrollment[] {
    return [...this.courses].sort((a, b) =>
      b.year !== a.year
        ? b.year - a.year
        : (this.semesterOrder[b.semester] ?? 0) - (this.semesterOrder[a.semester] ?? 0)
    );
  }

  openCourse(c: CourseEnrollment): void {
    this.router.navigate(['/dashboard/courses', c.courseId]);
  }

  getCourseColor(index: number): string {
    return ['#4A90C4', '#2ECC71', '#F0C040', '#C8102E', '#9B59B6'][index % 5];
  }

  goBack(): void {
    this.location.back();
  }
}