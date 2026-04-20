// frontend/src/app/features/courses/courses.ts
// Public course catalog browser at /courses.
// Shows all catalog entries as a searchable card grid.
// Clicking a card navigates to /courses/:id for the detail view.

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { environment } from '../../../environments/environment';
import { CourseCatalog } from '../../core/models/models';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './courses.html',
})
export class Courses implements OnInit {

  catalog:  CourseCatalog[] = [];
  loading   = true;
  error     = '';
  searchTerm = '';

  constructor(
    private http:   HttpClient,
    private router: Router,
    private cdr:    ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.catalog = await firstValueFrom(
        this.http.get<CourseCatalog[]>(`${environment.apiBaseUrl}/api/courses`)
      );
    } catch {
      this.error = 'Failed to load course catalog.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  get filtered(): CourseCatalog[] {
    if (!this.searchTerm.trim()) return this.catalog;
    const t = this.searchTerm.trim().toLowerCase();
    return this.catalog.filter(c =>
      c.courseCode.toLowerCase().includes(t)   ||
      c.courseName.toLowerCase().includes(t)   ||
      (c.description  ?? '').toLowerCase().includes(t) ||
      (c.department   ?? '').toLowerCase().includes(t)
    );
  }

  openCourse(catalogId: number): void {
    this.router.navigate(['/courses', catalogId]);
  }

  getDotColor(index: number): string {
    return ['#4A90C4', '#2ECC71', '#F0C040', '#C8102E', '#9B59B6'][index % 5];
  }
}