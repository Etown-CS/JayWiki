import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { User } from '../models/models';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class NavComponent implements OnInit, OnDestroy {

  currentUser: User | null = null;
  private sub: Subscription | null = null;

  constructor(public auth: AuthService) {}

  ngOnInit(): void {
    // Stays in sync when profile image is uploaded or name is changed.
    this.sub = this.auth.currentUser$.subscribe(u => (this.currentUser = u));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }
}