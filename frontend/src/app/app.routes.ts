import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(m => m.Login),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/courses',
    loadComponent: () => import('./features/my-courses/my-courses').then(m => m.MyCourses),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/courses/:courseId',
    loadComponent: () => import('./features/my-courses/course-detail').then(m => m.CourseDetail),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/projects',
    loadComponent: () => import('./features/my-projects/my-projects').then(m => m.MyProjects),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/projects/:projectId',
    loadComponent: () => import('./features/my-projects/project-detail').then(m => m.ProjectDetail),
    canActivate: [authGuard],
  },
  {
    path: 'students/:id',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
  },
  {
    path: 'projects/:projectId',
    loadComponent: () => import('./features/my-projects/project-detail').then(m => m.ProjectDetail),
  },
  {
    path: 'courses',
    loadComponent: () => import('./features/courses/courses').then(m => m.Courses),
  },
  {
    path: 'courses/:id',
    loadComponent: () => import('./features/courses/courses').then(m => m.Courses),
  },
  // ── Events (public) ───────────────────────────────────────────────────────
  {
    path: 'events',
    loadComponent: () => import('./features/events/events').then(m => m.Events),
  },
  {
    path: 'events/:id',
    loadComponent: () => import('./features/events/event-detail').then(m => m.EventDetail),
  },
  { path: '', redirectTo: 'gallery', pathMatch: 'full' },
  { path: 'gallery',
    loadComponent: () => import('./features/gallery/gallery').then(m => m.Gallery),
  },
  {
  path: 'explore',
  loadComponent: () => import('./features/explore/explore').then(m => m.Explore),
  },
  { path: '**', redirectTo: 'gallery' },
];