import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  mode: 'login' | 'register' = 'login';
  email = '';
  password = '';
  name = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private router: Router,
  ) {}

  switchMode(m: 'login' | 'register'): void {
    this.mode = m;
    this.errorMessage = '';
    this.successMessage = '';
  }

  loginGoogle(): void {
    this.authService.loginWithGoogle();
  }

  loginMicrosoft(): void {
    this.authService.loginWithMicrosoft();
  }

  async loginLocal(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response: any = await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/api/auth/login`, {
          email: this.email,
          password: this.password,
        })
      );

      localStorage.setItem('local_token', response.token);
      localStorage.setItem('local_user_name', response.name);
      sessionStorage.setItem('auth_provider', 'local');

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage = err.status === 401
        ? 'Invalid email or password.'
        : 'Something went wrong. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async register(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response: any = await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/api/auth/register`, {
          email: this.email,
          password: this.password,
          name: this.name || undefined,
        })
      );

      localStorage.setItem('local_token', response.token);
      localStorage.setItem('local_user_name', response.name);
      sessionStorage.setItem('auth_provider', 'local');

      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.errorMessage = err.status === 409
        ? 'An account with that email already exists.'
        : 'Registration failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}