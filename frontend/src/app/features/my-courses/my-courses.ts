// frontend/src/app/features/my-courses/my-courses.ts
// A — Authenticated user's full course list at /dashboard/courses

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { CourseEnrollment } from '../../core/models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule, NavComponent],
  templateUrl: './my-courses.html',
})
export class MyCourses implements OnInit {
  courses: CourseEnrollment[] = [];
  loading = true;
  error = '';
  userId: number | null = null;

  readonly semesterOrder: Record<string, number> = { Spring: 1, Summer: 2, Fall: 3 };

  constructor(
    private http: HttpClient,
    private api: ApiService,
    private authService: AuthService,
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

  get sortedCourses(): CourseEnrollment[] {
    return [...this.courses].sort((a, b) =>
      b.year !== a.year ? b.year - a.year
        : (this.semesterOrder[b.semester] ?? 0) - (this.semesterOrder[a.semester] ?? 0)
    );
  }

  openCourse(c: CourseEnrollment): void {
    this.router.navigate(['/dashboard/courses', c.courseId]);
  }

  getCourseColor(index: number): string {
    return ['#4A90C4', '#2ECC71', '#F0C040', '#C8102E', '#9B59B6'][index % 5];
  }
}