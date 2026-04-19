// frontend/src/app/features/courses/courses.ts
// E — Public course catalog browser at /courses
// Left sidebar lists all catalog courses; right panel shows enrollments for selected course.

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { environment } from '../../../environments/environment';
import { CourseCatalog, CourseEnrollment } from '../../core/models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './courses.html',
})
export class Courses implements OnInit {
  catalog: CourseCatalog[] = [];
  selectedCatalogId: number | null = null;
  enrollments: CourseEnrollment[] = [];
  selectedSemester = 'all';
  loadingCatalog = true;
  loadingEnrollments = false;
  error = '';
  searchTerm = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Support /courses/:id from the route
    const paramId = this.route.snapshot.paramMap.get('id');
    this.loadCatalog(paramId ? +paramId : null);
  }

  async loadCatalog(selectId: number | null): Promise<void> {
    this.loadingCatalog = true;
    try {
      this.catalog = await firstValueFrom(
        this.http.get<CourseCatalog[]>(`${environment.apiBaseUrl}/api/courses`)
      );
      const first = selectId
        ? this.catalog.find(c => c.catalogId === selectId)
        : this.catalog[0];
      if (first) this.selectCourse(first.catalogId);
    } catch {
      this.error = 'Failed to load course catalog.';
    } finally {
      this.loadingCatalog = false;
      this.cdr.detectChanges();
    }
  }

  async selectCourse(catalogId: number): Promise<void> {
    this.selectedCatalogId = catalogId;
    this.selectedSemester = 'all';
    this.loadingEnrollments = true;
    this.cdr.detectChanges();
    try {
      this.enrollments = await firstValueFrom(
        this.http.get<CourseEnrollment[]>(
          `${environment.apiBaseUrl}/api/courses/${catalogId}/enrollments`
        )
      );
    } catch {
      this.enrollments = [];
    } finally {
      this.loadingEnrollments = false;
      this.cdr.detectChanges();
    }
  }

  get selectedCourse(): CourseCatalog | undefined {
    return this.catalog.find(c => c.catalogId === this.selectedCatalogId);
  }

  get filteredCatalog(): CourseCatalog[] {
    if (!this.searchTerm) return this.catalog;
    const t = this.searchTerm.toLowerCase();
    return this.catalog.filter(c =>
      c.courseCode.toLowerCase().includes(t) ||
      c.courseName.toLowerCase().includes(t) ||
      (c.department ?? '').toLowerCase().includes(t)
    );
  }

  get semesters(): string[] {
    const seen = new Set<string>();
    for (const e of this.enrollments)
      seen.add(`${e.semester} ${e.year}`);
    return ['all', ...Array.from(seen).sort((a, b) => b.localeCompare(a))];
  }

  get filteredEnrollments(): CourseEnrollment[] {
    if (this.selectedSemester === 'all') return this.enrollments;
    return this.enrollments.filter(
      e => `${e.semester} ${e.year}` === this.selectedSemester
    );
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  getCatalogDotColor(index: number): string {
    return ['#4A90C4', '#2ECC71', '#F0C040', '#C8102E', '#9B59B6'][index % 5];
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'bg-[#2ECC71]/10 text-[#2ECC71]' : 'bg-[#4A90C4]/10 text-[#4A90C4]';
  }

  openStudentProfile(userId: number): void {
    this.router.navigate(['/students', userId]);
  }

  openProject(userId: number, projectId: number): void {
    this.router.navigate(['/gallery', userId, projectId]);
  }
}