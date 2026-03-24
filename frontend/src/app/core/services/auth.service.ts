import { Injectable } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

const googleConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  clientId: environment.google.clientId,
  // ADD THIS LINE - even though it's a SPA, the library needs it
  dummyClientSecret: environment.google.clientSecret,
  redirectUri: window.location.origin + '/index.html',
  scope: 'openid profile email',
  responseType: 'code',
  strictDiscoveryDocumentValidation: false,
  showDebugInformation: !environment.production,
  oidc: true,
  requireHttps: false,
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
  requireHttps: false,
  skipIssuerCheck: true,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private oauthService: OAuthService,
    private router: Router,
  ) {}

  async loginWithGoogle(): Promise<void> {
    console.log('[AUTH] Starting Google login...');
    sessionStorage.clear();
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    
    sessionStorage.setItem('auth_provider', 'google');
    this.oauthService.configure(googleConfig);
    await this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  async loginWithMicrosoft(): Promise<void> {
    console.log('[AUTH] Starting Microsoft login...');
    sessionStorage.clear();
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    
    sessionStorage.setItem('auth_provider', 'microsoft');
    this.oauthService.configure(microsoftConfig);
    await this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  async tryRestoreSession(): Promise<void> {
    const lastProvider = sessionStorage.getItem('auth_provider');
    console.log('[AUTH] tryRestoreSession called, provider:', lastProvider);
    
    if (!lastProvider) {
      console.log('[AUTH] No provider found, skipping restore');
      return;
    }
    
    const config = lastProvider === 'microsoft' ? microsoftConfig : googleConfig;
    this.oauthService.configure(config);
    
    console.log('[AUTH] Loading discovery document...');
    await this.oauthService.loadDiscoveryDocument();
    
    console.log('[AUTH] Attempting code flow...');
    await this.oauthService.tryLoginCodeFlow();
    
    console.log('[AUTH] Code flow complete. Checking login status...');
    console.log('[AUTH] hasValidIdToken:', this.oauthService.hasValidIdToken());
    console.log('[AUTH] hasValidAccessToken:', this.oauthService.hasValidAccessToken());
    console.log('[AUTH] isLoggedIn:', this.isLoggedIn);
    console.log('[AUTH] idToken:', this.oauthService.getIdToken() ? 'present' : 'missing');
    console.log('[AUTH] accessToken:', this.oauthService.getAccessToken() ? 'present' : 'missing');
    
    // Add a small delay to ensure tokens are fully processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (this.isLoggedIn) {
      console.log('[AUTH] Login successful! Navigating to dashboard...');
      this.router.navigate(['/dashboard']);
    } else {
      console.log('[AUTH] Login failed - tokens not valid');
      sessionStorage.removeItem('auth_provider');
    }
  }

  logout(): void {
    console.log('[AUTH] Logging out...');
    this.oauthService.logOut();
    sessionStorage.clear();
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('nonce');
    localStorage.removeItem('PKCE_verifier');
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