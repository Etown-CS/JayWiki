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
// Alias to avoid naming collision with the component class.
import {
  EventDetail as EventDetailData,
  EventMedia,
  Award,
  EventRegistration,
  User,
} from '../../core/models/models';
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

  // ── Registration ─────────────────────────────────────────────────────────
  isRegistered = false;
  regLoading   = false;
  regError     = '';

  // ── Media upload ─────────────────────────────────────────────────────────
  mediaType      = 'image';
  mediaUrl       = '';
  mediaFile: File | null = null;
  uploadingMedia = false;
  mediaError     = '';

  constructor(
    private route: ActivatedRoute,
    private http:  HttpClient,
    public  auth:  AuthService,
    private api:   ApiService,
    private cdr:   ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = 'No event ID.'; this.loading = false; return; }
    await this.loadEvent(+id);
  }

  private async loadEvent(id: number): Promise<void> {
    try {
      this.event = await firstValueFrom(
        this.http.get<EventDetailData>(`${environment.apiBaseUrl}/api/events/${id}`)
      );
      await this.deriveRegistrationState();
    } catch {
      this.error = 'Failed to load event.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Determines whether the logged-in user is already registered for this event.
   *
   * auth.currentUser is set by upsertUser() after OAuth login, and by
   * dashboard.ts calling setCurrentUser() on load (which covers local-auth users).
   *
   * If the user navigates directly to an event URL before visiting the dashboard,
   * currentUser may still be null. In that case we fall back to GET /api/users/me
   * and cache the result into shared state so other components don't re-fetch.
   */
  private async deriveRegistrationState(): Promise<void> {
    if (!this.auth.isLoggedIn || !this.event) return;

    let myId = this.auth.currentUser?.userId;

    if (!myId) {
      try {
        const me = await firstValueFrom(
          this.http.get<User>(
            `${environment.apiBaseUrl}/api/users/me`,
            { headers: this.api.authHeaders() }
          )
        );
        myId = me.userId;
        this.auth.setCurrentUser(me);
      } catch {
        return; // not critical — button just won't reflect true initial state
      }
    }

    this.isRegistered = this.event.registrations.some(r => r.userId === myId);
  }

  // ── Registration toggle ───────────────────────────────────────────────────

  async toggleRegistration(): Promise<void> {
    if (!this.event || !this.auth.isLoggedIn) return;
    this.regLoading = true;
    this.regError   = '';

    const base    = `${environment.apiBaseUrl}/api/events/${this.event.eventId}/registrations`;
    const headers = this.api.authHeaders();

    try {
      if (this.isRegistered) {
        await firstValueFrom(this.http.delete(base, { headers }));
        this.event.registrations = this.event.registrations.filter(
          r => r.userId !== this.auth.currentUser?.userId
        );
        this.isRegistered = false;
      } else {
        const reg = await firstValueFrom(
          this.http.post<EventRegistration>(base, {}, { headers })
        );
        this.event.registrations = [...this.event.registrations, reg];
        this.isRegistered = true;
      }
    } catch {
      this.regError = 'Action failed. Please try again.';
    } finally {
      this.regLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  onMediaFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mediaFile = input.files?.[0] ?? null;
  }

  async addMedia(): Promise<void> {
    if (!this.event) return;
    this.uploadingMedia = true;
    this.mediaError     = '';

    const base    = `${environment.apiBaseUrl}/api/events/${this.event.eventId}/media`;
    const headers = this.api.authHeaders();

    try {
      if (this.mediaType === 'link') {
        const created = await firstValueFrom(
          this.http.post<EventMedia>(
            base,
            { mediaType: 'link', url: this.mediaUrl },
            { headers }
          )
        );
        this.event.media = [...(this.event.media ?? []), created];
        this.mediaUrl = '';
      } else if (this.mediaFile) {
        const form = new FormData();
        form.append('file', this.mediaFile);
        form.append('mediaType', this.mediaType);
        const created = await firstValueFrom(
          this.http.post<EventMedia>(`${base}/upload`, form, { headers })
        );
        this.event.media = [...(this.event.media ?? []), created];
        this.mediaFile = null;
      }
    } catch {
      this.mediaError = 'Upload failed.';
    } finally {
      this.uploadingMedia = false;
      this.cdr.detectChanges();
    }
  }

  async deleteMedia(mediaId: number): Promise<void> {
    if (!this.event) return;
    const headers = this.api.authHeaders();
    try {
      await firstValueFrom(
        this.http.delete(
          `${environment.apiBaseUrl}/api/events/${this.event.eventId}/media/${mediaId}`,
          { headers }
        )
      );
      this.event.media = this.event.media.filter(m => m.eventMediaId !== mediaId);
      this.cdr.detectChanges();
    } catch {
      this.mediaError = 'Delete failed.';
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }
}