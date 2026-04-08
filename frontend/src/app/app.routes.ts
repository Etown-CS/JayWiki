import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  // ── Auth ─────────────────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(m => m.Login),
  },

  // ── Dashboard (authenticated — own profile + nested pages) ───────────────────
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        // A — My full course list
        path: 'courses',
        loadComponent: () => import('./features/my-courses/my-courses').then(m => m.MyCourses),
      },
      {
        // D — My course detail (own enrollment view, editable)
        path: 'courses/:courseId',
        loadComponent: () => import('./features/my-courses/course-detail').then(m => m.CourseDetail),
      },
      {
        // B — My full project list
        path: 'projects',
        loadComponent: () => import('./features/my-projects/my-projects').then(m => m.MyProjects),
      },
      {
        // C — My project detail (own view, editable)
        path: 'projects/:projectId',
        loadComponent: () => import('./features/my-projects/project-detail').then(m => m.ProjectDetail),
      },
    ],
  },

  // ── Students (public) ────────────────────────────────────────────────────────
  {
    path: 'students',
    loadComponent: () => import('./features/students/students').then(m => m.Students),
  },
  {
    path: 'students/:id',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
  },

  // ── Gallery — All Projects (public) ──────────────────────────────────────────
  {
    path: 'gallery',
    loadComponent: () => import('./features/gallery/gallery').then(m => m.Gallery),
  },
  {
    // C — Project detail (public read-only view)
    path: 'gallery/:userId/:projectId',
    loadComponent: () => import('./features/my-projects/project-detail').then(m => m.ProjectDetail),
  },

  // ── Courses — Catalog Browser (public) ───────────────────────────────────────
  {
    path: 'courses',
    loadComponent: () => import('./features/courses/courses').then(m => m.Courses),
  },
  {
    // E detail — Catalog entry + all enrollments
    path: 'courses/:id',
    loadComponent: () => import('./features/courses/course-catalog-detail').then(m => m.CourseCatalogDetail),
  },

  // ── Redirects ────────────────────────────────────────────────────────────────
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },

];