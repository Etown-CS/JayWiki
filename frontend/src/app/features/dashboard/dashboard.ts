import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="bg-white p-10 rounded-2xl shadow-md text-center">
        <h1 class="text-2xl font-semibold text-gray-800 mb-2">Welcome, {{ authService.userName }}!</h1>
        <p class="text-gray-500 text-sm mb-6">You are logged in. Auth is working. ✅</p>
        <button
          (click)="authService.logout()"
          class="px-6 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">
          Sign out
        </button>
      </div>
    </div>
  `,
})
export class Dashboard {
  constructor(public authService: AuthService) {}
}