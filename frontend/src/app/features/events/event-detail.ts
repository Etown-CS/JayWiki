// frontend/src/app/features/events/event-detail.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EventDetail as EventDetailData, EventMedia } from '../../core/models/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './event-detail.html',
})
export class EventDetail implements OnInit {
  event: EventDetailData | null = null;

  loading = true;
  error   = '';

  // Resolved from GET /api/users/me after login — used for registration state only
  public currentUserId: number | null = null;

  // Registration state
  public isRegistered    = false;
  public registerLoading = false;
  public registerError   = '';

  // Media upload state
  public showMediaForm  = false;
  public mediaType      = 'image'; // 'image' | 'video' | 'link'
  public mediaLinkUrl   = '';
  public mediaFile: File | null = null;
  public mediaFileName  = '';
  public mediaUploading = false;
  public mediaError     = '';

  // Delete state
  public deletingMediaId: number | null = null;

  private eventId = 0;

  constructor(
    private route: ActivatedRoute,
    private http:  HttpClient,
    public  auth:  AuthService,
    private api:   ApiService,
    private cdr:   ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));

    // Resolve current user ID for registration state checks.
    // The backend always validates via JWT — this is UI state only.
    if (this.auth.isLoggedIn) {
      try {
        const me = await firstValueFrom(
          this.http.get<{ userId: number }>(
            `${environment.apiBaseUrl}/api/users/me`,
            { headers: this.api.authHeaders() }
          )
        );
        this.currentUserId = me.userId;
      } catch { /* non-fatal — register button simply won't show pre-checked */ }
    }

    await this.loadEvent();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  private async loadEvent(): Promise<void> {
    try {
      this.event = await firstValueFrom(
        this.http.get<EventDetailData>(
          `${environment.apiBaseUrl}/api/events/${this.eventId}`
        )
      );
      this.syncRegistrationState();
    } catch {
      this.error = 'Failed to load event.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private syncRegistrationState(): void {
    if (!this.auth.isLoggedIn || !this.event || !this.currentUserId) return;
    this.isRegistered = this.event.registrations.some(r => r.userId === this.currentUserId);
  }

  // ── Registration ────────────────────────────────────────────────────────────

  async toggleRegistration(): Promise<void> {
    if (!this.auth.isLoggedIn || !this.event) return;

    this.registerLoading = true;
    this.registerError   = '';

    try {
      if (this.isRegistered) {
        await firstValueFrom(
          this.http.delete(
            `${environment.apiBaseUrl}/api/events/${this.eventId}/registrations/${this.currentUserId}`,
            { headers: this.api.authHeaders() }
          )
        );
        this.event.registrations = this.event.registrations
          .filter(r => r.userId !== this.currentUserId);
        this.isRegistered = false;
      } else {
        const reg = await firstValueFrom(
          this.http.post<any>(
            `${environment.apiBaseUrl}/api/events/${this.eventId}/registrations`,
            {},
            { headers: this.api.authHeaders() }
          )
        );
        this.event.registrations = [...this.event.registrations, reg];
        this.isRegistered = true;
      }
    } catch {
      this.registerError = this.isRegistered
        ? 'Failed to unregister. Please try again.'
        : 'Failed to register. Please try again.';
    } finally {
      this.registerLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Media upload ────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.mediaFile     = input.files[0];
      this.mediaFileName = input.files[0].name;
    }
  }

  async submitMedia(): Promise<void> {
    if (!this.event) return;

    this.mediaUploading = true;
    this.mediaError     = '';

    try {
      const formData = new FormData();
      formData.append('mediaType', this.mediaType);

      if (this.mediaType === 'link') {
        if (!this.mediaLinkUrl.trim()) {
          this.mediaError = 'URL is required for links.';
          return;
        }
        formData.append('url', this.mediaLinkUrl.trim());
      } else {
        if (!this.mediaFile) {
          this.mediaError = 'Please select a file.';
          return;
        }
        formData.append('file', this.mediaFile);
      }

      const added = await firstValueFrom(
        this.http.post<EventMedia>(
          `${environment.apiBaseUrl}/api/events/${this.eventId}/media`,
          formData,
          { headers: this.api.authHeaders() }
        )
      );

      this.event.media = [...this.event.media, added];
      this.resetMediaForm();
    } catch {
      this.mediaError = 'Upload failed. Please try again.';
    } finally {
      this.mediaUploading = false;
      this.cdr.detectChanges();
    }
  }

  async deleteMedia(mediaId: number): Promise<void> {
    if (!this.event) return;

    this.deletingMediaId = mediaId;
    try {
      await firstValueFrom(
        this.http.delete(
          `${environment.apiBaseUrl}/api/events/${this.eventId}/media/${mediaId}`,
          { headers: this.api.authHeaders() }
        )
      );
      this.event.media = this.event.media.filter(m => m.eventMediaId !== mediaId);
    } catch { /* non-fatal — user can retry */ } finally {
      this.deletingMediaId = null;
      this.cdr.detectChanges();
    }
  }

  resetMediaForm(): void {
    this.showMediaForm  = false;
    this.mediaType      = 'image';
    this.mediaLinkUrl   = '';
    this.mediaFile      = null;
    this.mediaFileName  = '';
    this.mediaError     = '';
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  getCategoryColor(category: string): string {
    switch (category) {
      case 'academic': return 'bg-[#4A90C4]/20 text-[#4A90C4]';
      case 'club':     return 'bg-purple-500/20 text-purple-400';
      case 'sport':    return 'bg-green-500/20 text-green-400';
      default:         return 'bg-gray-500/20 text-gray-400';
    }
  }

  getCategoryLabel(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  formatAwardDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  isUpcoming(dateStr: string): boolean {
    return new Date(dateStr) >= new Date();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}