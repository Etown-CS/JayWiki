import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NavComponent } from '../../core/nav/nav';
import { EventSummary } from '../../core/models/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule, NavComponent],
  templateUrl: './events.html',
})
export class Events implements OnInit {
  events: EventSummary[]         = [];
  filteredEvents: EventSummary[] = [];

  loading = true;
  error   = '';

  // Filter state
  searchTerm     = '';
  selectedCategory = '';
  readonly categories = ['club', 'sport', 'academic', 'other'];

  constructor(
    private http:   HttpClient,
    private router: Router,
    private cdr:    ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadEvents();
  }

  private async loadEvents(): Promise<void> {
    try {
      this.events = await firstValueFrom(
        this.http.get<EventSummary[]>(`${environment.apiBaseUrl}/api/events`)
      );
      this.applyFilters();
    } catch {
      this.error = 'Failed to load events.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  applyFilters(): void {
    let results = [...this.events];

    if (this.selectedCategory) {
      results = results.filter(e => e.category === this.selectedCategory);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      results = results.filter(e =>
        e.title.toLowerCase().includes(term) ||
        (e.description ?? '').toLowerCase().includes(term)
      );
    }

    this.filteredEvents = results;
  }

  clearFilters(): void {
    this.searchTerm      = '';
    this.selectedCategory = '';
    this.applyFilters();
  }

  navigateToEvent(eventId: number): void {
    this.router.navigate(['/events', eventId]);
  }

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
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  isUpcoming(dateStr: string): boolean {
    return new Date(dateStr) >= new Date();
  }
}