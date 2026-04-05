import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauthService = inject(OAuthService);
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);

  if (!isApiRequest) return next(req);

  const provider = sessionStorage.getItem('auth_provider');
  let token: string | null = null;

  if (provider === 'local') {
    // Local email/password — token stored directly in localStorage by AuthService
    token = localStorage.getItem('local_token');
  } else if (provider === 'google') {
    // Google: backend validates ID token against clientId audience
    // Access tokens are opaque and will fail backend JWT validation
    token = oauthService.getIdToken() || oauthService.getAccessToken();
  } else if (provider === 'microsoft') {
    // Microsoft: must use access token scoped to API audience
    // Do NOT fall back to ID token — it will fail audience validation
    token = oauthService.getAccessToken();
  }

  if (token) {
    return next(req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }));
  }

  return next(req);
};