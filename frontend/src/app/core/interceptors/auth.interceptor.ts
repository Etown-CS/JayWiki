import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauthService = inject(OAuthService);
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);

  if (isApiRequest) {
    const identityClaims = oauthService.getIdentityClaims() as Record<string, unknown> | null;
    const issuer = (identityClaims?.['iss'] as string) ?? '';
    const accessToken = oauthService.getAccessToken();
    const idToken = oauthService.getIdToken();

    let token: string | null = null;
    if (issuer.includes('accounts.google.com')) {
      // Google: access tokens are opaque — fall back to ID token for API auth.
      token = accessToken || idToken;
    } else {
      // Microsoft: must use access token scoped to API audience.
      // Do NOT fall back to ID token — it will fail audience validation.
      token = accessToken;
    }

    if (token) {
      return next(req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      }));
    }
  }

  return next(req);
};