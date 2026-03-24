import { Injectable } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

const googleConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  clientId: environment.google.clientId,
  // NOTE: This library requires dummyClientSecret for Web Application OAuth clients.
  // While this value is exposed in the client bundle, Google's OAuth security relies on:
  // - Redirect URI validation (prevents domain hijacking)
  // - PKCE (prevents authorization code interception)
  // - Backend token validation (verifies all tokens independently)
  // For production apps, consider migrating to @abacritt/angularx-social-login
  dummyClientSecret: environment.google.clientSecret,
  redirectUri: window.location.origin + '/index.html',
  scope: 'openid profile email',
  responseType: 'code',
  strictDiscoveryDocumentValidation: false,
  showDebugInformation: !environment.production,
  oidc: true,
  // Allow HTTP only for local development
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
  // Allow HTTP only for local development
  requireHttps: environment.production,
  // Skip issuer check only in development (common endpoint causes issuer mismatch)
  skipIssuerCheck: !environment.production,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private oauthService: OAuthService,
    private router: Router,
  ) {}

  private log(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.log(`[AUTH] ${message}`, ...args);
    }
  }

  private clearAuthStorage(): void {
    // Clear only auth-related keys, not all sessionStorage
    sessionStorage.removeItem('auth_provider');
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('nonce');
    localStorage.removeItem('PKCE_verifier');
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
      this.log('Login successful! Navigating to dashboard...');
      this.router.navigate(['/dashboard']);
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
    if (provider === 'microsoft') {
      return this.oauthService.hasValidIdToken() && this.oauthService.hasValidAccessToken();
    }
    return this.oauthService.hasValidIdToken();
  }

  get idToken(): string {
    return this.oauthService.getIdToken();
  }

  get claims(): Record<string, unknown> {
    return this.oauthService.getIdentityClaims() as Record<string, unknown>;
  }

  get userName(): string {
    const claims = this.claims;
    return (claims?.['name'] as string) ?? (claims?.['email'] as string) ?? 'User';
  }
}