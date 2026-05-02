import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then(m => m.Login),
  },

  // ── Authenticated dashboard routes ────────────────────────────────────────
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

  // ── Public student profiles ───────────────────────────────────────────────
  {
    path: 'students/:id',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
  },

  // ── Public project detail — two routes both load the same component.
  //    /projects/:projectId  — canonical route (used by Projects, Explore).
  //    /projects/:userId/:projectId — legacy route kept so existing navigations
  //    from Courses and other pages that pass userId don't break. ProjectDetail
  //    uses userId when available to scope the API call, otherwise falls back
  //    to the global GET /api/projects/:projectId endpoint.
  {
    path: 'projects/:projectId',
    loadComponent: () => import('./features/my-projects/project-detail').then(m => m.ProjectDetail),
  },
  {
    path: 'projects/:userId/:projectId',
    loadComponent: () => import('./features/my-projects/project-detail').then(m => m.ProjectDetail),
  },
  {
  path: 'dashboard/events',
  loadComponent: () => import('./features/my-events/my-events').then(m => m.MyEvents),
  canActivate: [authGuard],
  },

  // ── Public course catalog ─────────────────────────────────────────────────
  {
    path: 'courses',
    loadComponent: () => import('./features/courses/courses').then(m => m.Courses),
  },
  {
    path: 'courses/:id',
    loadComponent: () => import('./features/courses/course-catalog-detail').then(m => m.CourseCatalogDetail),
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
  {
  path: 'awards/:id',
  loadComponent: () => import('./features/award-detail/award-detail').then(m => m.AwardDetail),
  },

  // ── Projects + Explore (public) ────────────────────────────────────────────
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/projects').then(m => m.Projects),
  },
  {
    path: 'explore',
    loadComponent: () => import('./features/explore/explore').then(m => m.Explore),
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  { path: '',   redirectTo: 'explore', pathMatch: 'full' },
  { path: '**', redirectTo: 'explore' },
];