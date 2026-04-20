// frontend/src/app/features/courses/course-catalog-detail.ts
// Public course detail page at /courses/:id.
// Shows course info, semester filter, and enrolled students + their projects.

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { environment } from '../../../environments/environment';
import { CourseCatalog, CourseEnrollmentEntry } from '../../core/models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-course-catalog-detail',
  standalone: true,
  imports: [CommonModule, NavComponent],
  templateUrl: './course-catalog-detail.html',
})
export class CourseCatalogDetail implements OnInit {

  course:      CourseCatalog        | null = null;
  enrollments: CourseEnrollmentEntry[]     = [];
  loading      = true;
  error        = '';
  selectedSemester = 'all';

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient,
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
    } catch {
      this.error = 'Failed to load course.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  get semesters(): string[] {
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

  goBack(): void {
    this.router.navigate(['/courses']);
  }

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