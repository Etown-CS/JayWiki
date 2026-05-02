import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavComponent } from '../../core/nav/nav';
import { AwardDetail as AwardDetailData } from '../../core/models/models';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-award-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavComponent],
  templateUrl: './award-detail.html',
})
export class AwardDetail implements OnInit {

  award: AwardDetailData | null = null;
  loading = true;
  error   = '';

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient,
    private cdr:    ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = 'No award ID.'; this.loading = false; return; }
    try {
      this.award = await firstValueFrom(
        this.http.get<AwardDetailData>(`${environment.apiBaseUrl}/api/awards/${id}`)
      );
    } catch {
      this.error = 'Award not found.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  goBack(): void {
    this.router.navigate(['/events']);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
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