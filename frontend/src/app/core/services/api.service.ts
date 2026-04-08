// frontend/src/app/core/services/api.service.ts
// Centralises auth header construction so no component duplicates this logic.

import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private authService: AuthService) {}

  /** Returns an HttpHeaders object with Bearer token if the user is logged in. */
  authHeaders(): HttpHeaders {
    const provider = sessionStorage.getItem('auth_provider');
    let token: string | null = null;
    if (provider === 'local') {
      token = localStorage.getItem('local_token');
    } else if (provider === 'microsoft') {
      token = this.authService.accessToken;
    } else {
      token = this.authService.idToken || this.authService.accessToken;
    }
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}