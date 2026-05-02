import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  EventDetail as EventDetailData,
  EventMedia,
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

  // ── Registration ──────────────────────────────────────────────────────────
  isRegistered    = false;
  registerLoading = false;
  registerError   = '';

  // ── Media upload ──────────────────────────────────────────────────────────
  showMediaForm  = false;
  mediaType      = 'image';
  mediaLinkUrl   = '';
  mediaFile: File | null = null;
  mediaFileName  = '';
  mediaUploading = false;
  mediaError     = '';
  deletingMediaId: number | null = null;

  constructor(
    private route:    ActivatedRoute,
    private http:     HttpClient,
    public  auth:     AuthService,
    private api:      ApiService,
    private cdr:      ChangeDetectorRef,
    private location: Location,
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
        return;
      }
    }

    this.isRegistered = this.event.registrations.some(r => r.userId === myId);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goBack(): void {
    this.location.back();
  }

  // ── Registration toggle ───────────────────────────────────────────────────

  async toggleRegistration(): Promise<void> {
    if (!this.event || !this.auth.isLoggedIn) return;
    this.registerLoading = true;
    this.registerError   = '';

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
      this.registerError = 'Action failed. Please try again.';
    } finally {
      this.registerLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Media ─────────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    this.mediaFile     = file;
    this.mediaFileName = file?.name ?? '';
  }

  resetMediaForm(): void {
    this.showMediaForm  = false;
    this.mediaType      = 'image';
    this.mediaFile      = null;
    this.mediaFileName  = '';
    this.mediaLinkUrl   = '';
    this.mediaError     = '';
    this.mediaUploading = false;
  }

  async submitMedia(): Promise<void> {
    if (!this.event) return;
    this.mediaUploading = true;
    this.mediaError     = '';

    const base    = `${environment.apiBaseUrl}/api/events/${this.event.eventId}/media`;
    const headers = this.api.authHeaders();

    try {
      if (this.mediaType === 'link') {
        const created = await firstValueFrom(
          this.http.post<EventMedia>(
            base,
            { mediaType: 'link', url: this.mediaLinkUrl },
            { headers }
          )
        );
        this.event.media = [...(this.event.media ?? []), created];
        this.mediaLinkUrl = '';
      } else if (this.mediaFile) {
        const form = new FormData();
        form.append('file', this.mediaFile);
        form.append('mediaType', this.mediaType);
        const created = await firstValueFrom(
          this.http.post<EventMedia>(`${base}/upload`, form, { headers })
        );
        this.event.media = [...(this.event.media ?? []), created];
      }
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
    const headers = this.api.authHeaders();
    try {
      await firstValueFrom(
        this.http.delete(
          `${environment.apiBaseUrl}/api/events/${this.event.eventId}/media/${mediaId}`,
          { headers }
        )
      );
      this.event.media = this.event.media.filter(m => m.eventMediaId !== mediaId);
    } catch {
      this.mediaError = 'Delete failed.';
    } finally {
      this.deletingMediaId = null;
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isUpcoming(dateStr: string): boolean {
    return new Date(dateStr) > new Date();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  formatAwardDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  }

  getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      academic: 'bg-[#4A90C4]/15 text-[#4A90C4]',
      club:     'bg-[#2ECC71]/15 text-[#2ECC71]',
      sport:    'bg-[#F0C040]/15 text-[#F0C040]',
      other:    'bg-white/10 text-white/60',
    };
    return map[cat] ?? map['other'];
  }

  getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      academic: 'Academic',
      club:     'Club',
      sport:    'Sport',
      other:    'Other',
    };
    return map[cat] ?? cat;
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }
}