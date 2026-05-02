// Authenticated user's full project list at /dashboard/projects.
// Owns all state and API calls; delegates modal UI to ProjectFormModal.

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { Project } from '../../core/models/models';
import { ProjectFormModal } from './project-form-modal';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

// Exported so ProjectFormModal can import them without circular deps
export interface UserCourse {
  courseId:   number;
  semester:   string;
  year:       number;
  instructor?: string;
  course: {
    catalogId:   number;
    courseCode:  string;
    courseName:  string;
    department?: string;
    credits?:    number;
  };
}

export interface ProjectForm {
  title:       string;
  description: string;
  projectType: string;
  status:      string;
  courseId:    number | null;
  startDate:   string;
  endDate:     string;
  githubUrl:   string;
  demoUrl:     string;
}

@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent, ProjectFormModal],
  templateUrl: './my-projects.html',
})
export class MyProjects implements OnInit {
  projects : Project[]    = [];
  courses  : UserCourse[] = [];
  loading  = true;
  error    = '';
  userId   : number | null = null;

  // ── Modal state ──────────────────────────────────────────────────────────────
  modalOpen        = false;
  isEditMode       = false;
  editingProjectId : number | null = null;
  saving           = false;
  saveError        = '';

  form: ProjectForm = this.emptyForm();

  // Topics
  pendingTopics   : string[]                            = [];
  existingTopics  : { topicId: number; name: string }[] = [];
  removedTopicIds : number[]                            = [];

  // Collaborators (edit only)
  collaboratorError  = '';
  collaboratorAdding = false;
  existingCollaborators: { userId: number; name: string }[] = [];

  // Filter
  filterStatus = 'all';
  filterType   = 'all';

  constructor(
    private http  : HttpClient,
    private api   : ApiService,
    private router: Router,
    private cdr   : ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.loadAll(); }

  // ── Data loading ─────────────────────────────────────────────────────────────

  async loadAll(): Promise<void> {
    this.loading = true;
    try {
      const headers = this.api.authHeaders();
      const me = await firstValueFrom(
        this.http.get<{ userId: number }>(`${environment.apiBaseUrl}/api/users/me`, { headers })
      );
      this.userId = me.userId;

      const [projects, courses] = await Promise.all([
        firstValueFrom(
          this.http.get<Project[]>(
            `${environment.apiBaseUrl}/api/users/${this.userId}/projects`, { headers }
          )
        ),
        firstValueFrom(
          this.http.get<UserCourse[]>(
            `${environment.apiBaseUrl}/api/users/${this.userId}/courses`, { headers }
          )
        ).catch(() => [] as UserCourse[]),
      ]);

      this.projects = projects;
      this.courses  = courses;
    } catch {
      this.error = 'Failed to load projects.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Filtered list ────────────────────────────────────────────────────────────

  get filteredProjects(): Project[] {
    return this.projects.filter(p => {
      const statusOk = this.filterStatus === 'all' || p.status === this.filterStatus;
      const typeOk   = this.filterType   === 'all' || p.projectType === this.filterType;
      return statusOk && typeOk;
    });
  }

  // ── Modal open/close ─────────────────────────────────────────────────────────

  openCreate(): void {
    this.isEditMode            = false;
    this.editingProjectId      = null;
    this.form                  = this.emptyForm();
    this.pendingTopics         = [];
    this.existingTopics        = [];
    this.removedTopicIds       = [];
    this.existingCollaborators = [];
    this.saveError             = '';
    this.collaboratorError     = '';
    this.modalOpen             = true;
  }

  openEdit(p: Project): void {
    this.isEditMode       = true;
    this.editingProjectId = p.projectId;
    this.form = {
      title:       p.title,
      description: p.description ?? '',
      projectType: p.projectType,
      status:      p.status,
      courseId:    null,
      startDate:   p.startDate ?? '',
      endDate:     p.endDate   ?? '',
      githubUrl:   p.githubUrl ?? '',
      demoUrl:     p.demoUrl   ?? '',
    };
    this.existingTopics        = [...(p.topics        ?? [])];
    this.pendingTopics         = [];
    this.removedTopicIds       = [];
    this.existingCollaborators = [...(p.collaborators ?? [])];
    this.saveError             = '';
    this.collaboratorError     = '';

    if (p.course) {
      const match = this.courses.find(
        c => c.course.courseCode === p.course!.courseCode &&
             c.semester   === p.course!.semester   &&
             c.year       === p.course!.year
      );
      if (match) this.form.courseId = match.courseId;
    }

    this.modalOpen = true;
  }

  closeModal(): void { this.modalOpen = false; }

  // ── Topic event handlers (emitted from modal) ────────────────────────────────

  onPendingTopicAdded(name: string): void {
    this.pendingTopics = [...this.pendingTopics, name];
  }

  onPendingTopicRemoved(name: string): void {
    this.pendingTopics = this.pendingTopics.filter(t => t !== name);
  }

  onExistingTopicRemoved(topicId: number): void {
    this.removedTopicIds = [...this.removedTopicIds, topicId];
    this.existingTopics  = this.existingTopics.filter(t => t.topicId !== topicId);
  }

  // ── Collaborator event handlers ──────────────────────────────────────────────

  async onCollaboratorAdded(email: string): Promise<void> {
    if (!this.editingProjectId) return;
    this.collaboratorAdding = true;
    this.collaboratorError  = '';
    try {
      const headers = this.api.authHeaders();
      const result  = await firstValueFrom(
        this.http.post<{ userId: number; name: string }>(
          `${environment.apiBaseUrl}/api/projects/${this.editingProjectId}/collaborators`,
          { email }, { headers }
        )
      );
      this.existingCollaborators = [...this.existingCollaborators, result];
      this.cdr.detectChanges();
    } catch {
      this.collaboratorError = 'Could not add collaborator. Check the email is registered.';
    } finally {
      this.collaboratorAdding = false;
    }
  }

  async onCollaboratorRemoved(userId: number): Promise<void> {
    if (!this.editingProjectId) return;
    try {
      const headers = this.api.authHeaders();
      await firstValueFrom(
        this.http.delete(
          `${environment.apiBaseUrl}/api/projects/${this.editingProjectId}/collaborators/${userId}`,
          { headers }
        )
      );
      this.existingCollaborators = this.existingCollaborators.filter(c => c.userId !== userId);
      this.cdr.detectChanges();
    } catch { /* silently ignore */ }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    if (!this.form.title.trim()) { this.saveError = 'Title is required.'; return; }
    if (!this.userId) return;
    this.saving    = true;
    this.saveError = '';

    const headers = this.api.authHeaders();
    const body    = {
      title:       this.form.title.trim(),
      description: this.form.description.trim() || null,
      projectType: this.form.projectType,
      status:      this.form.status,
      courseId:    this.form.courseId  || null,
      startDate:   this.form.startDate || null,
      endDate:     this.form.endDate   || null,
      githubUrl:   this.form.githubUrl.trim() || null,
      demoUrl:     this.form.demoUrl.trim()   || null,
    };

    try {
      let projectId: number;

      if (this.isEditMode && this.editingProjectId) {
        projectId = this.editingProjectId;
        await firstValueFrom(
          this.http.put(
            `${environment.apiBaseUrl}/api/users/${this.userId}/projects/${projectId}`,
            body, { headers }
          )
        );
        await Promise.all(
          this.removedTopicIds.map(id =>
            firstValueFrom(
              this.http.delete(
                `${environment.apiBaseUrl}/api/projects/${projectId}/topics/${id}`,
                { headers }
              )
            )
          )
        );
      } else {
        const created = await firstValueFrom(
          this.http.post<{ projectId: number }>(
            `${environment.apiBaseUrl}/api/users/${this.userId}/projects`,
            body, { headers }
          )
        );
        projectId = created.projectId;
      }

      await Promise.all(
        this.pendingTopics.map(name =>
          firstValueFrom(
            this.http.post(
              `${environment.apiBaseUrl}/api/projects/${projectId}/topics`,
              { name }, { headers }
            )
          )
        )
      );

      await this.loadAll();
      this.closeModal();
    } catch {
      this.saveError = 'Failed to save project. Please try again.';
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  openDetail(projectId: number): void {
    this.router.navigate(['/dashboard/projects', projectId]);
  }

  // ── Display helpers ──────────────────────────────────────────────────────────

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  getProjectEmoji(type: string): string {
    return { academic: '🌐', research: '🔬', club: '🎯', personal: '💡' }[type] ?? '📁';
  }

  getStatusClass(status: string): string {
    return status === 'active'
      ? 'bg-[#2ECC71]/10 text-[#2ECC71] border-[#2ECC71]/20'
      : status === 'completed'
        ? 'bg-[#4A90C4]/10 text-[#4A90C4] border-[#4A90C4]/20'
        : 'bg-white/5 text-[#7A9BBF] border-white/10';
  }

  getTopicClass(i: number): string {
    const classes = [
      'bg-[#4A90C4]/10 text-[#4A90C4] border-[#4A90C4]/20',
      'bg-[#C8102E]/10 text-[#FF6B6B] border-[#C8102E]/20',
      'bg-[#2ECC71]/10 text-[#2ECC71] border-[#2ECC71]/20',
      'bg-[#F0C040]/10 text-[#F0C040] border-[#F0C040]/20',
    ];
    return classes[i % classes.length];
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  private emptyForm(): ProjectForm {
    return {
      title: '', description: '', projectType: 'academic',
      status: 'active', courseId: null,
      startDate: '', endDate: '', githubUrl: '', demoUrl: '',
    };
  }
}