import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauthService = inject(OAuthService);
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);

  // Use access token (not ID token) for API authorization.
  // For Microsoft this is a JWT scoped to your API audience.
  // For Google this falls back to the ID token since Google access
  // tokens are opaque and cannot be validated as JWTs by the backend.
  const token = oauthService.getAccessToken() || oauthService.getIdToken();

  if (isApiRequest && token) {
    const authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(authReq);
  }

  return next(req);
};