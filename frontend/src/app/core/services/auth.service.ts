import { Injectable } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

const googleConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  clientId: environment.google.clientId,
  dummyClientSecret: environment.google.clientSecret,
  redirectUri: window.location.origin + '/index.html',
  scope: 'openid profile email',
  responseType: 'code',
  strictDiscoveryDocumentValidation: false,
  showDebugInformation: !environment.production,
  oidc: true,
  requireHttps: environment.production,
};

const microsoftConfig: AuthConfig = {
  issuer: `https://login.microsoftonline.com/common/v2.0`,
  clientId: environment.microsoft.clientId,
  redirectUri: window.location.origin + '/index.html',
  scope: `openid profile email ${environment.microsoft.apiScope}`,
  responseType: 'code',
  strictDiscoveryDocumentValidation: false,
  showDebugInformation: !environment.production,
  useSilentRefresh: false,
  sessionChecksEnabled: false,
  requireHttps: environment.production,
  skipIssuerCheck: true,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Prevents upsertUser() from firing on every navigation —
  // only needs to run once per session after login.
  private userUpserted = false;

  constructor(
    private oauthService: OAuthService,
    private router: Router,
    private http: HttpClient,
  ) {}

  private log(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.log(`[AUTH] ${message}`, ...args);
    }
  }

  private clearAuthStorage(): void {
    sessionStorage.removeItem('auth_provider');
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('nonce');
    localStorage.removeItem('PKCE_verifier');
    localStorage.removeItem('local_token');
    localStorage.removeItem('local_user_name');
    this.userUpserted = false; // reset on logout/new login
  }

  // Calls POST /api/users/me to upsert the user in the database after login.
  // Uses the ID token for Google, access token for Microsoft.
  // Only runs once per session — subsequent navigations skip this entirely.
  private async upsertUser(): Promise<void> {
    if (this.userUpserted) {
      this.log('upsertUser: already upserted this session, skipping');
      return;
    }

    const provider = sessionStorage.getItem('auth_provider');
    const token = provider === 'microsoft'
      ? this.oauthService.getAccessToken()
      : this.oauthService.getIdToken();

    if (!token) {
      this.log('upsertUser: no token available, skipping');
      return;
    }

    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const result = await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/api/users/me`, {}, { headers })
      );
      this.log('upsertUser success:', result);
      this.userUpserted = true;
    } catch (err) {
      // Log but don't block navigation — user can still use the app
      this.log('upsertUser failed:', err);
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.log('Starting Google login...');
    this.clearAuthStorage();
    sessionStorage.setItem('auth_provider', 'google');
    this.oauthService.configure(googleConfig);
    await this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  async loginWithMicrosoft(): Promise<void> {
    this.log('Starting Microsoft login...');
    this.clearAuthStorage();
    sessionStorage.setItem('auth_provider', 'microsoft');
    this.oauthService.configure(microsoftConfig);
    await this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  async tryRestoreSession(): Promise<void> {
    const lastProvider = sessionStorage.getItem('auth_provider');
    this.log('tryRestoreSession called, provider:', lastProvider);

    if (!lastProvider) {
      this.log('No provider found, skipping restore');
      return;
    }

    const config = lastProvider === 'microsoft' ? microsoftConfig : googleConfig;
    this.oauthService.configure(config);

    this.log('Loading discovery document...');
    await this.oauthService.loadDiscoveryDocument();

    this.log('Attempting code flow...');
    await this.oauthService.tryLoginCodeFlow();

    this.log('Code flow complete. Checking login status...');
    this.log('hasValidIdToken:', this.oauthService.hasValidIdToken());
    this.log('hasValidAccessToken:', this.oauthService.hasValidAccessToken());
    this.log('isLoggedIn:', this.isLoggedIn);

    if (this.isLoggedIn) {
      this.log('Login successful! Upserting user...');
      await this.upsertUser();

      // Only redirect to dashboard from entry points — don't hijack
      // in-app navigation when the user is already on a valid route.
      const currentPath = window.location.pathname;
      const shouldRedirect = currentPath === '/'
        || currentPath === '/login'
        || currentPath === '/index.html';

      if (shouldRedirect) {
        this.log('Navigating to dashboard...');
        this.router.navigate(['/dashboard']);
      } else {
        this.log('Already on a valid route, staying at:', currentPath);
      }
    } else {
      this.log('Login failed - tokens not valid');
      sessionStorage.removeItem('auth_provider');
    }
  }

  logout(): void {
    this.log('Logging out...');
    this.oauthService.logOut();
    this.clearAuthStorage();
    this.router.navigate(['/login']);
  }

  get isLoggedIn(): boolean {
    const provider = sessionStorage.getItem('auth_provider');
    if (provider === 'local') {
      return !!localStorage.getItem('local_token');
    }
    if (provider === 'microsoft') {
      return this.oauthService.hasValidIdToken() && this.oauthService.hasValidAccessToken();
    }
    return this.oauthService.hasValidIdToken();
  }

  get idToken(): string {
    return this.oauthService.getIdToken();
  }

  get accessToken(): string {
    return this.oauthService.getAccessToken();
  }

  get claims(): Record<string, unknown> {
    return this.oauthService.getIdentityClaims() as Record<string, unknown>;
  }

  get userName(): string {
    const provider = sessionStorage.getItem('auth_provider');

    if (provider === 'local') {
      return localStorage.getItem('local_user_name') ?? 'User';
    }

    const claims = this.claims;
    return (claims?.['name'] as string) ?? (claims?.['email'] as string) ?? 'User';
  }
}