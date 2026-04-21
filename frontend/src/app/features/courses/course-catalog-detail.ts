// frontend/src/app/features/courses/course-catalog-detail.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { CourseCatalog, CourseEnrollmentEntry, CourseEnrollment } from '../../core/models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-course-catalog-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './course-catalog-detail.html',
})
export class CourseCatalogDetail implements OnInit {

  course:      CourseCatalog         | null = null;
  enrollments: CourseEnrollmentEntry[]      = [];
  loading      = true;
  error        = '';
  selectedSemester = 'all';

  // ── Enrollment state ──────────────────────────────────────────────────────
  // Whether the current user (student) is already enrolled in this course
  isEnrolled    = false;
  showEnrollForm = false;
  enrollForm    = { semester: 'Fall', year: new Date().getFullYear(), instructor: '' };
  enrollSaving  = false;
  enrollError   = '';
  enrollSuccess = false;

  readonly semesters = ['Fall', 'Spring', 'Summer', 'Fall/Spring'];

  // Year range: current year back to 1980
  // Note: 1980 is a placeholder — update to a meaningful start year when known
  readonly years: number[] = Array.from(
    { length: new Date().getFullYear() - 1980 + 1 },
    (_, i) => new Date().getFullYear() - i
  );

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient,
    private api:    ApiService,
    public  auth:   AuthService,
    private cdr:    ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = 'No course ID.'; this.loading = false; return; }

    try {
      const [course, enrollments] = await Promise.all([
        firstValueFrom(
          this.http.get<CourseCatalog>(`${environment.apiBaseUrl}/api/courses/${id}`)
        ),
        firstValueFrom(
          this.http.get<CourseEnrollmentEntry[]>(
            `${environment.apiBaseUrl}/api/courses/${id}/enrollments`
          )
        ),
      ]);
      this.course      = course;
      this.enrollments = enrollments;

      // Check if the logged-in student is already enrolled in this course
      await this.checkEnrollmentStatus(+id);

    } catch {
      this.error = 'Failed to load course.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Enrollment status check ───────────────────────────────────────────────

  private async checkEnrollmentStatus(catalogId: number): Promise<void> {
    if (!this.auth.isLoggedIn || !this.isStudent) return;
    try {
      const me = this.auth.currentUser ?? await firstValueFrom(
        this.http.get<{ userId: number }>(`${environment.apiBaseUrl}/api/users/me`,
          { headers: this.api.authHeaders() })
      );
      const myEnrollments = await firstValueFrom(
        this.http.get<CourseEnrollment[]>(
          `${environment.apiBaseUrl}/api/users/${me.userId}/courses`,
          { headers: this.api.authHeaders() }
        )
      );
      // Student is "enrolled" if any enrollment matches this catalog entry
      this.isEnrolled = myEnrollments.some(e => e.catalogId === catalogId);
    } catch {
      // Non-critical — enrollment button just defaults to showing
    }
  }

  // ── Enrollment form ───────────────────────────────────────────────────────

  openEnrollForm(): void {
    this.enrollForm    = { semester: 'Fall', year: new Date().getFullYear(), instructor: '' };
    this.enrollError   = '';
    this.enrollSuccess = false;
    this.showEnrollForm = true;
  }

  closeEnrollForm(): void { this.showEnrollForm = false; }

  async enroll(): Promise<void> {
    if (!this.course) return;
    this.enrollSaving = true;
    this.enrollError  = '';

    try {
      const me = this.auth.currentUser ?? await firstValueFrom(
        this.http.get<{ userId: number }>(`${environment.apiBaseUrl}/api/users/me`,
          { headers: this.api.authHeaders() })
      );

      // Frontend duplicate check
      const myEnrollments = await firstValueFrom(
        this.http.get<CourseEnrollment[]>(
          `${environment.apiBaseUrl}/api/users/${me.userId}/courses`,
          { headers: this.api.authHeaders() }
        )
      );
      const duplicate = myEnrollments.some(e =>
        e.catalogId === this.course!.catalogId &&
        e.semester  === this.enrollForm.semester &&
        e.year      === this.enrollForm.year
      );
      if (duplicate) {
        this.enrollError = `You are already enrolled in ${this.course.courseCode} for ${this.enrollForm.semester} ${this.enrollForm.year}.`;
        this.enrollSaving = false;
        return;
      }

      await firstValueFrom(
        this.http.post(
          `${environment.apiBaseUrl}/api/users/${me.userId}/courses`,
          {
            catalogId:  this.course.catalogId,
            semester:   this.enrollForm.semester,
            year:       this.enrollForm.year,
            instructor: this.enrollForm.instructor.trim() || null,
          },
          { headers: this.api.authHeaders() }
        )
      );

      this.isEnrolled    = true;
      this.enrollSuccess = true;
      this.showEnrollForm = false;

    } catch (err: any) {
      // Backend 409 safety net
      this.enrollError = err?.error?.message ?? 'Failed to enroll. Please try again.';
    } finally {
      this.enrollSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get isStudent(): boolean {
    return this.auth.currentUser?.role === 'student';
  }

  get semesterList(): string[] {
    const seen = new Set<string>();
    for (const e of this.enrollments) seen.add(`${e.semester} ${e.year}`);
    return ['all', ...Array.from(seen).sort((a, b) => b.localeCompare(a))];
  }

  get filteredEnrollments(): CourseEnrollmentEntry[] {
    if (this.selectedSemester === 'all') return this.enrollments;
    return this.enrollments.filter(
      e => `${e.semester} ${e.year}` === this.selectedSemester
    );
  }

  goBack(): void { this.router.navigate(['/courses']); }

  openStudentProfile(userId: number): void {
    this.router.navigate(['/students', userId]);
  }

  openProject(userId: number, projectId: number): void {
    this.router.navigate(['/projects', userId, projectId]);
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  getStatusClass(status: string): string {
    return status === 'active'
      ? 'bg-[#2ECC71]/10 text-[#2ECC71]'
      : 'bg-[#4A90C4]/10 text-[#4A90C4]';
  }
}