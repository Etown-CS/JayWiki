// frontend/src/app/features/my-courses/course-detail.ts
// D — Detail view of a single course enrollment + its projects

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { environment } from '../../../environments/environment';
import { CourseEnrollment, Project } from '../../core/models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, NavComponent, RouterLink],
  templateUrl: './course-detail.html',
})
export class CourseDetail implements OnInit {
  enrollment: CourseEnrollment | null = null;
  projects: Project[] = [];
  loading = true;
  error = '';
  userId: number | null = null;
  courseId: number | null = null;

  constructor(
    private http: HttpClient,
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.courseId = +this.route.snapshot.paramMap.get('courseId')!;
    this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      const headers = this.api.authHeaders();
      const me = await firstValueFrom(
        this.http.get<{ userId: number }>(`${environment.apiBaseUrl}/api/users/me`, { headers })
      );
      this.userId = me.userId;

      this.enrollment = await firstValueFrom(
        this.http.get<CourseEnrollment>(
          `${environment.apiBaseUrl}/api/users/${me.userId}/courses/${this.courseId}`,
          { headers }
        )
      );

      this.projects = await firstValueFrom(
        this.http.get<Project[]>(
          `${environment.apiBaseUrl}/api/users/${me.userId}/courses/${this.courseId}/projects`,
          { headers }
        )
      );
    } catch {
      this.error = 'Failed to load course details.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openProject(p: Project): void {
    this.router.navigate(['/dashboard/projects', p.projectId]);
  }

  getStatusClass(status: string): string {
    return status === 'active'
      ? 'bg-[#2ECC71]/10 text-[#2ECC71]'
      : 'bg-[#4A90C4]/10 text-[#4A90C4]';
  }

  getProjectEmoji(type: string): string {
    return { academic: '🌐', research: '🔬', club: '🎯', personal: '💡' }[type] ?? '📁';
  }

  formatDate(d?: string): string {
    if (!d) return 'Present';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}