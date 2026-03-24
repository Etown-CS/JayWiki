import { Injectable } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

const googleConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  clientId: environment.google.clientId,
  redirectUri: window.location.origin + '/index.html',
  scope: 'openid profile email',
  responseType: 'code',
  strictDiscoveryDocumentValidation: false,
  showDebugInformation: !environment.production,
};

const microsoftConfig: AuthConfig = {
  issuer: `https://login.microsoftonline.com/${environment.microsoft.tenantId}/v2.0`,
  clientId: environment.microsoft.clientId,
  redirectUri: window.location.origin + '/index.html',
  scope: `openid profile email ${environment.microsoft.apiScope}`,
  responseType: 'code',
  strictDiscoveryDocumentValidation: false,
  showDebugInformation: !environment.production,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private oauthService: OAuthService,
    private router: Router,
  ) {}

  async loginWithGoogle(): Promise<void> {
    sessionStorage.setItem('auth_provider', 'google');
    this.oauthService.configure(googleConfig);
    await this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  async loginWithMicrosoft(): Promise<void> {
    sessionStorage.setItem('auth_provider', 'microsoft');
    this.oauthService.configure(microsoftConfig);
    await this.oauthService.loadDiscoveryDocumentAndLogin();
  }

  async tryRestoreSession(): Promise<void> {
    const lastProvider = sessionStorage.getItem('auth_provider');
    const config = lastProvider === 'microsoft' ? microsoftConfig : googleConfig;
    this.oauthService.configure(config);
    await this.oauthService.loadDiscoveryDocument();
    await this.oauthService.tryLoginCodeFlow();
  }

  logout(): void {
    this.oauthService.logOut();
    sessionStorage.removeItem('auth_provider');
    this.router.navigate(['/']);
  }

  get isLoggedIn(): boolean {
    const provider = sessionStorage.getItem('auth_provider');
    if (provider === 'microsoft') {
      // For Microsoft, require both a valid ID token and access token so that
      // frontend "logged in" state matches backend authorization requirements.
      return this.oauthService.hasValidIdToken() && this.oauthService.hasValidAccessToken();
    }
    // For Google (or unknown), ID token is used for API auth so check that only.
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