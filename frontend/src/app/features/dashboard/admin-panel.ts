import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { CourseCatalog, EventSummary } from '../../core/models/models';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

type AdminTab = 'courses' | 'events' | 'awards';

interface AwardWithRecipient {
  awardId: number;
  title: string;
  description?: string;
  awardedAt: string;
  eventId?: number;
  userId?: number;
  recipient?: { userId: number; name: string };
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
})
export class AdminPanel implements OnInit {

  activeTab: AdminTab = 'courses';

  readonly adminTabs: { value: AdminTab; label: string }[] = [
    { value: 'courses', label: 'Courses' },
    { value: 'events',  label: 'Events'  },
    { value: 'awards',  label: 'Awards'  },
  ];

  // ── Course Catalog ────────────────────────────────────────────────────────
  courses:       CourseCatalog[] = [];
  coursesLoading = true;
  courseError    = '';

  showCourseForm  = false;
  editingCourseId: number | null = null;
  courseForm = { courseCode: '', courseName: '', department: '', credits: null as number | null, description: '' };
  courseSaving    = false;
  courseSaveError = '';

  // ── Events ────────────────────────────────────────────────────────────────
  events:       EventSummary[] = [];
  eventsLoading = true;
  eventError    = '';

  showEventForm  = false;
  editingEventId: number | null = null;
  eventForm = { title: '', description: '', category: 'academic', eventDate: '' };
  eventSaving    = false;
  eventSaveError = '';

  readonly eventCategories = ['academic', 'club', 'sport', 'other'];

  // ── Awards ────────────────────────────────────────────────────────────────
  awards:       AwardWithRecipient[] = [];
  awardsLoading = true;
  awardError    = '';

  showAwardForm  = false;
  awardForm = { title: '', description: '', recipientEmail: '', eventId: null as number | null, awardedAt: '' };
  awardSaving    = false;
  awardSaveError = '';

  constructor(
    private http: HttpClient,
    private api:  ApiService,
    private cdr:  ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCourses();
    this.loadEvents();
    this.loadAwards();
  }

  setTab(tab: AdminTab): void { this.activeTab = tab; }

  // ── Course Catalog ────────────────────────────────────────────────────────

  async loadCourses(): Promise<void> {
    this.coursesLoading = true;
    try {
      this.courses = await firstValueFrom(
        this.http.get<CourseCatalog[]>(`${environment.apiBaseUrl}/api/courses`)
      );
    } catch {
      this.courseError = 'Failed to load courses.';
    } finally {
      this.coursesLoading = false;
      this.cdr.detectChanges();
    }
  }

  openCreateCourse(): void {
    this.editingCourseId = null;
    this.courseForm      = { courseCode: '', courseName: '', department: '', credits: null, description: '' };
    this.courseSaveError = '';
    this.showCourseForm  = true;
  }

  openEditCourse(c: CourseCatalog): void {
    this.editingCourseId = c.catalogId;
    this.courseForm      = {
      courseCode:  c.courseCode,
      courseName:  c.courseName,
      department:  c.department  ?? '',
      credits:     c.credits     ?? null,
      description: c.description ?? '',
    };
    this.courseSaveError = '';
    this.showCourseForm  = true;
  }

  closeCourseForm(): void { this.showCourseForm = false; }

  async saveCourse(): Promise<void> {
    if (!this.courseForm.courseCode.trim() || !this.courseForm.courseName.trim()) {
      this.courseSaveError = 'Course code and name are required.';
      return;
    }
    this.courseSaving    = true;
    this.courseSaveError = '';
    const headers = this.api.authHeaders();
    const body = {
      courseCode:  this.courseForm.courseCode.trim(),
      courseName:  this.courseForm.courseName.trim(),
      department:  this.courseForm.department.trim()  || null,
      credits:     this.courseForm.credits            || null,
      description: this.courseForm.description.trim() || null,
    };
    try {
      if (this.editingCourseId) {
        await firstValueFrom(
          this.http.put(`${environment.apiBaseUrl}/api/courses/${this.editingCourseId}`, body, { headers })
        );
      } else {
        await firstValueFrom(
          this.http.post(`${environment.apiBaseUrl}/api/courses`, body, { headers })
        );
      }
      await this.loadCourses();
      this.closeCourseForm();
    } catch (err: any) {
      this.courseSaveError = err?.error?.message ?? 'Failed to save course.';
    } finally {
      this.courseSaving = false;
      this.cdr.detectChanges();
    }
  }

  async deleteCourse(id: number): Promise<void> {
    if (!confirm('Delete this course? This cannot be undone if no students are enrolled.')) return;
    const headers = this.api.authHeaders();
    try {
      await firstValueFrom(this.http.delete(`${environment.apiBaseUrl}/api/courses/${id}`, { headers }));
      this.courses = this.courses.filter(c => c.catalogId !== id);
      this.cdr.detectChanges();
    } catch (err: any) {
      this.courseError = err?.error?.message ?? 'Failed to delete course.';
      this.cdr.detectChanges();
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async loadEvents(): Promise<void> {
    this.eventsLoading = true;
    try {
      this.events = await firstValueFrom(
        this.http.get<EventSummary[]>(`${environment.apiBaseUrl}/api/events`)
      );
    } catch {
      this.eventError = 'Failed to load events.';
    } finally {
      this.eventsLoading = false;
      this.cdr.detectChanges();
    }
  }

  openCreateEvent(): void {
    this.editingEventId = null;
    this.eventForm      = { title: '', description: '', category: 'academic', eventDate: '' };
    this.eventSaveError = '';
    this.showEventForm  = true;
  }

  openEditEvent(e: EventSummary): void {
    this.editingEventId = e.eventId;
    this.eventForm      = {
      title:       e.title,
      description: e.description ?? '',
      category:    e.category,
      eventDate:   e.eventDate.split('T')[0],
    };
    this.eventSaveError = '';
    this.showEventForm  = true;
  }

  closeEventForm(): void { this.showEventForm = false; }

  async saveEvent(): Promise<void> {
    if (!this.eventForm.title.trim() || !this.eventForm.eventDate) {
      this.eventSaveError = 'Title and date are required.';
      return;
    }
    this.eventSaving    = true;
    this.eventSaveError = '';
    const headers = this.api.authHeaders();
    const body = {
      title:       this.eventForm.title.trim(),
      description: this.eventForm.description.trim() || null,
      category:    this.eventForm.category,
      eventDate:   new Date(this.eventForm.eventDate).toISOString(),
    };
    try {
      if (this.editingEventId) {
        await firstValueFrom(
          this.http.put(`${environment.apiBaseUrl}/api/events/${this.editingEventId}`, body, { headers })
        );
      } else {
        await firstValueFrom(
          this.http.post(`${environment.apiBaseUrl}/api/events`, body, { headers })
        );
      }
      await this.loadEvents();
      this.closeEventForm();
    } catch (err: any) {
      this.eventSaveError = err?.error?.message ?? 'Failed to save event.';
    } finally {
      this.eventSaving = false;
      this.cdr.detectChanges();
    }
  }

  async deleteEvent(id: number): Promise<void> {
    if (!confirm('Delete this event? All registrations and media will also be removed.')) return;
    const headers = this.api.authHeaders();
    try {
      await firstValueFrom(this.http.delete(`${environment.apiBaseUrl}/api/events/${id}`, { headers }));
      this.events = this.events.filter(e => e.eventId !== id);
      this.cdr.detectChanges();
    } catch (err: any) {
      this.eventError = err?.error?.message ?? 'Failed to delete event.';
      this.cdr.detectChanges();
    }
  }

  // ── Awards ────────────────────────────────────────────────────────────────

  async loadAwards(): Promise<void> {
    this.awardsLoading = true;
    try {
      const users = await firstValueFrom(
        this.http.get<{ userId: number; name: string }[]>(`${environment.apiBaseUrl}/api/users`)
      );
      const awardsPerUser = await Promise.all(
        users.map(u =>
          firstValueFrom(
            this.http.get<AwardWithRecipient[]>(
              `${environment.apiBaseUrl}/api/users/${u.userId}/awards`
            )
          )
          .then(awards => awards.map(a => ({ ...a, recipient: { userId: u.userId, name: u.name } })))
          .catch(() => [] as AwardWithRecipient[])
        )
      );
      this.awards = awardsPerUser
        .flat()
        .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
    } catch {
      this.awardError = 'Failed to load awards.';
    } finally {
      this.awardsLoading = false;
      this.cdr.detectChanges();
    }
  }

  openCreateAward(): void {
    this.awardForm      = { title: '', description: '', recipientEmail: '', eventId: null, awardedAt: '' };
    this.awardSaveError = '';
    this.showAwardForm  = true;
  }

  closeAwardForm(): void { this.showAwardForm = false; }

  async saveAward(): Promise<void> {
    if (!this.awardForm.title.trim() || !this.awardForm.recipientEmail.trim()) {
      this.awardSaveError = 'Title and recipient email are required.';
      return;
    }
    this.awardSaving    = true;
    this.awardSaveError = '';
    const headers = this.api.authHeaders();
    try {
      const users = await firstValueFrom(
        this.http.get<{ userId: number; name: string; primaryEmail?: string }[]>(
          `${environment.apiBaseUrl}/api/users`
        )
      );
      const recipient = users.find(
        u => u.primaryEmail?.toLowerCase() === this.awardForm.recipientEmail.trim().toLowerCase()
      );
      if (!recipient) {
        this.awardSaveError = 'No user found with that email.';
        this.awardSaving = false;
        return;
      }
      const body = {
        title:       this.awardForm.title.trim(),
        description: this.awardForm.description.trim() || null,
        eventId:     this.awardForm.eventId            || null,
        awardedAt:   this.awardForm.awardedAt
          ? new Date(this.awardForm.awardedAt).toISOString()
          : null,
      };
      await firstValueFrom(
        this.http.post(
          `${environment.apiBaseUrl}/api/users/${recipient.userId}/awards`,
          body,
          { headers }
        )
      );
      await this.loadAwards();
      this.closeAwardForm();
    } catch (err: any) {
      this.awardSaveError = err?.error?.message ?? 'Failed to save award.';
    } finally {
      this.awardSaving = false;
      this.cdr.detectChanges();
    }
  }

  async deleteAward(award: AwardWithRecipient): Promise<void> {
    if (!award.recipient) return;
    if (!confirm(`Delete award "${award.title}"?`)) return;
    const headers = this.api.authHeaders();
    try {
      await firstValueFrom(
        this.http.delete(
          `${environment.apiBaseUrl}/api/users/${award.recipient.userId}/awards/${award.awardId}`,
          { headers }
        )
      );
      this.awards = this.awards.filter(a => a.awardId !== award.awardId);
      this.cdr.detectChanges();
    } catch (err: any) {
      this.awardError = err?.error?.message ?? 'Failed to delete award.';
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  getCategoryClass(cat: string): string {
    const map: Record<string, string> = {
      academic: 'bg-[#4A90C4]/15 text-[#4A90C4]',
      club:     'bg-[#2ECC71]/15 text-[#2ECC71]',
      sport:    'bg-[#F0C040]/15 text-[#F0C040]',
      other:    'bg-white/10 text-white/60',
    };
    return map[cat] ?? map['other'];
  }
}