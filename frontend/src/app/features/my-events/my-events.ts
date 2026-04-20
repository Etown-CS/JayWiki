// frontend/src/app/features/my-events/my-events.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EventSummary } from '../../core/models/models';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-my-events',
  standalone: true,
  imports: [CommonModule, RouterLink, NavComponent],
  templateUrl: './my-events.html',
})
export class MyEvents implements OnInit {

  events:  EventSummary[] = [];
  loading  = true;
  error    = '';
  userId: number | null = null;

  // Unregistering state
  unregisteringId: number | null = null;
  unregisterError = '';

  constructor(
    private http:        HttpClient,
    private api:         ApiService,
    private authService: AuthService,
    private router:      Router,
    private cdr:         ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading = true;
    try {
      const headers = this.api.authHeaders();
      const me = await firstValueFrom(
        this.http.get<{ userId: number }>(`${environment.apiBaseUrl}/api/users/me`, { headers })
      );
      this.userId = me.userId;
      this.events = await firstValueFrom(
        this.http.get<EventSummary[]>(
          `${environment.apiBaseUrl}/api/users/${me.userId}/events`, { headers }
        )
      );
    } catch {
      this.error = 'Failed to load events.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async unregister(eventId: number): Promise<void> {
    if (!this.userId) return;
    this.unregisteringId = eventId;
    this.unregisterError = '';
    try {
      const headers = this.api.authHeaders();
      await firstValueFrom(
        this.http.delete(
          `${environment.apiBaseUrl}/api/events/${eventId}/registrations/${this.userId}`,
          { headers }
        )
      );
      this.events = this.events.filter(e => e.eventId !== eventId);
    } catch {
      this.unregisterError = 'Failed to unregister. Please try again.';
    } finally {
      this.unregisteringId = null;
      this.cdr.detectChanges();
    }
  }

  openEvent(eventId: number): void {
    this.router.navigate(['/events', eventId]);
  }

  isUpcoming(dateStr: string): boolean {
    return new Date(dateStr) > new Date();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
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
}