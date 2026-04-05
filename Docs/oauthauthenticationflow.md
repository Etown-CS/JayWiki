# Authentication Flow Diagram

This diagram shows the three supported authentication flows: Google OAuth 2.0, Microsoft Entra ID, and local email/password. The `angular-oauth2-oidc` library handles frontend OAuth token acquisition, while ASP.NET Core JWT Bearer middleware validates all tokens on the backend.

---

## Complete OAuth Flow (Google or Microsoft)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Web Browser
    participant Frontend as Angular Frontend<br/>(angular-oauth2-oidc)
    participant Google as Google OAuth 2.0
    participant Microsoft as Microsoft Entra ID<br/>(common endpoint)
    participant Backend as ASP.NET Core API<br/>(JWT Bearer Middleware)
    participant DB as Azure SQL Database

    Note over User,DB: User initiates OAuth login

    User->>Browser: Click "Sign in with Google" or "Sign in with Microsoft"
    Browser->>Frontend: Trigger OAuth login

    alt Google OAuth Flow
        Frontend->>Google: Redirect to Google OAuth<br/>(client_id, redirect_uri, scopes, PKCE)
        Google->>User: Present Google login page
        User->>Google: Enter credentials & consent
        Google->>Frontend: Redirect with authorization code
        Frontend->>Google: Exchange code for ID token
        Google-->>Frontend: ID token (JWT with user claims)
    else Microsoft Entra ID Flow
        Frontend->>Microsoft: Redirect to Microsoft common endpoint<br/>(client_id, redirect_uri, scopes, PKCE)
        Microsoft->>User: Present Microsoft login page<br/>(@etown.edu or personal Microsoft account)
        User->>Microsoft: Enter credentials & consent
        Microsoft->>Frontend: Redirect with authorization code
        Frontend->>Microsoft: Exchange code for access token
        Microsoft-->>Frontend: Access token (JWT with user claims)
    end

    Note over Frontend: Token + provider stored in browser storage<br/>(localStorage + sessionStorage)

    Frontend->>Backend: POST /api/users/me<br/>(Authorization: Bearer token)

    Backend->>Backend: Inspect 'iss' claim<br/>(route to Google or Microsoft scheme)

    alt Token from Google
        Backend->>Google: Validate signature & expiration<br/>using Google public keys
        Google-->>Backend: Token valid ✓
    else Token from Microsoft
        Backend->>Microsoft: Validate signature & expiration<br/>using Microsoft public keys<br/>(skipIssuerCheck: true — common endpoint)
        Microsoft-->>Backend: Token valid ✓
    end

    Backend->>Backend: Extract claims (email, name)<br/>Determine provider from 'iss'

    Backend->>DB: SELECT * FROM UserIdentities<br/>WHERE Provider = ? AND ProviderEmail = ?

    alt Identity exists (returning user)
        DB-->>Backend: Return identity + user
        Backend->>DB: UPDATE Users SET Name, UpdatedAt
        DB-->>Backend: Updated
        Backend->>Browser: Return user profile (HTTP 200)
    else Same email, different provider (auto-link)
        DB-->>Backend: No identity found for this provider<br/>but email exists under another provider
        Backend->>DB: INSERT INTO UserIdentities (link to existing User)
        DB-->>Backend: Identity linked
        Backend->>Browser: Return user profile (HTTP 200)
    else First-time login (new user)
        DB-->>Backend: No identity or user found
        Backend->>DB: INSERT INTO Users
        Backend->>DB: INSERT INTO UserIdentities (IsPrimary = true)
        DB-->>Backend: New user + identity created
        Backend->>Browser: Return new user profile (HTTP 201)
    end

    Frontend->>User: Navigate to dashboard
```

---

## Local Email/Password Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Angular Frontend
    participant Backend as ASP.NET Core API
    participant DB as Azure SQL Database

    Note over User,DB: Registration

    User->>Frontend: Enter email, password, name
    Frontend->>Backend: POST /api/auth/register<br/>{ email, password, name }
    Backend->>DB: Check UserIdentities WHERE Provider='local' AND ProviderEmail=email
    DB-->>Backend: Not found
    Backend->>DB: INSERT INTO Users
    Backend->>DB: INSERT INTO UserIdentities<br/>(Provider='local', PasswordHash=BCrypt(password), IsPrimary=true)
    Backend->>Backend: Generate signed JWT<br/>(issuer: jaywiki-api, 7-day expiry)
    Backend->>Frontend: Return JWT + user info (HTTP 200)
    Frontend->>Frontend: Store token in localStorage as 'local_token'<br/>Set sessionStorage auth_provider = 'local'
    Frontend->>User: Navigate to dashboard

    Note over User,DB: Login

    User->>Frontend: Enter email + password
    Frontend->>Backend: POST /api/auth/login<br/>{ email, password }
    Backend->>DB: SELECT * FROM UserIdentities<br/>WHERE Provider='local' AND ProviderEmail=email
    DB-->>Backend: Return identity (or not found)
    Backend->>Backend: BCrypt.Verify(password, hash)<br/>(always runs — static dummy hash prevents timing attacks)
    alt Valid credentials
        Backend->>Backend: Generate signed JWT
        Backend->>Frontend: Return JWT + user info (HTTP 200)
        Frontend->>Frontend: Store token as 'local_token'
        Frontend->>User: Navigate to dashboard
    else Invalid credentials
        Backend->>Frontend: HTTP 401 Unauthorized
        Frontend->>User: Show error message
    end
```

---

## Linking Additional Providers

```mermaid
sequenceDiagram
    actor User
    participant Frontend as Angular Frontend
    participant Backend as ASP.NET Core API
    participant DB as Azure SQL Database

    Note over User,DB: User already logged in via Google or Microsoft

    User->>Frontend: Submit link form<br/>{ email, password }
    Frontend->>Backend: POST /api/auth/link<br/>(Authorization: Bearer existing OAuth token)
    Backend->>Backend: Resolve current user from token<br/>(provider + email from iss + claims)
    Backend->>DB: Check target email not already taken<br/>as a local identity
    Backend->>DB: INSERT INTO UserIdentities<br/>(Provider='local', IsPrimary=false)
    Backend->>Frontend: HTTP 200 — local login linked
    Frontend->>User: Confirm success
```

---

## Token Validation Detail

```mermaid
flowchart TD
    Start([Incoming API Request]) --> HasToken{Bearer token<br/>present?}
    HasToken -->|No| E401A[HTTP 401 Unauthorized]

    HasToken -->|Yes| ReadIss[Read 'iss' claim<br/>from token]

    ReadIss --> RouteScheme{Which issuer?}

    RouteScheme -->|accounts.google.com| Google[Google scheme<br/>Validate ID token<br/>against clientId audience]
    RouteScheme -->|login.microsoftonline.com| Microsoft[Microsoft scheme<br/>Validate access token<br/>skipIssuerCheck: true<br/>common endpoint]
    RouteScheme -->|jaywiki-api| Local[Local scheme<br/>Validate HMAC-SHA256<br/>signature + audience]
    RouteScheme -->|Unknown| E401B[HTTP 401 Unauthorized<br/>Unrecognized issuer —<br/>rejected before DB access]

    Google --> SigCheck{Signature +<br/>expiry valid?}
    Microsoft --> SigCheck
    Local --> SigCheck

    SigCheck -->|No| E401C[HTTP 401 Unauthorized]
    SigCheck -->|Yes| ResolveEmail[Resolve email from claims<br/>email → preferred_username → upn]

    ResolveEmail --> DBLookup[SELECT FROM UserIdentities<br/>WHERE Provider = ? AND ProviderEmail = ?]

    DBLookup -->|Found| Authorized[✅ Request authorized<br/>currentUser loaded]
    DBLookup -->|Not found| E404[HTTP 404 / 401<br/>User not provisioned]

    style E401A fill:#FF6B6B,color:#fff
    style E401B fill:#FF6B6B,color:#fff
    style E401C fill:#FF6B6B,color:#fff
    style E404 fill:#FFA500,color:#fff
    style Authorized fill:#50C878,color:#fff
```

---

## Flow Explanation

### OAuth (Google / Microsoft)

**Phase 1 — Provider Selection**
User clicks Google or Microsoft button. Frontend sets `auth_provider` in `sessionStorage` and configures `angular-oauth2-oidc` with the appropriate `AuthConfig`.

**Phase 2 — OAuth Provider Authentication**
Frontend uses PKCE code flow. User authenticates with their provider. Google returns an ID token; Microsoft returns an access token. Both are JWTs containing user claims.

**Phase 3 — Token Storage**
`angular-oauth2-oidc` stores the token in `localStorage`. The interceptor reads it on every subsequent request and attaches it as a `Bearer` header automatically.

**Phase 4 — User Upsert**
After OAuth completes, `tryRestoreSession()` calls `POST /api/users/me` with the token. The backend creates or updates the user's `UserIdentity` and `User` rows. If the same email exists under another provider, the new identity is linked to the existing user automatically.

**Phase 5 — Navigation**
After successful upsert, the frontend navigates to `/dashboard`.

### Local (Email + Password)

Login and registration are handled entirely by the frontend form — no OAuth redirect. The backend issues its own signed JWT. The Angular interceptor checks `sessionStorage auth_provider === 'local'` and reads the token from `localStorage local_token` instead of `angular-oauth2-oidc`.

---

## Security Features

### Frontend (angular-oauth2-oidc)
- **PKCE:** Prevents authorization code interception attacks
- **State parameter:** Prevents CSRF during OAuth callback
- **Provider isolation:** `auth_provider` in `sessionStorage` ensures correct token type is sent per provider
- **Interceptor:** Automatically attaches the correct Bearer token based on active provider

### Backend (ASP.NET Core JWT Bearer)
- **Triple authentication schemes:** "Google", "Microsoft", "Local" — each with independent validation
- **Policy-based MultiScheme selector:** Routes to correct scheme by inspecting `iss` claim before validation
- **Unrecognized issuer rejection:** Tokens from unknown issuers rejected before any DB access
- **Provider-scoped user lookup:** `UserIdentity` queried by both `Provider` AND `ProviderEmail` — prevents cross-provider identity confusion
- **BCrypt password hashing:** Passwords never stored in plain text; static dummy hash prevents timing-based user enumeration
- **Audience validation:** Ensures tokens were issued for this API
- **Signature verification:** Cryptographic validation using provider public keys
- **`skipIssuerCheck: true` for Microsoft:** Required because the `common` endpoint issues tokens with tenant-specific issuers that don't match the common issuer URL

---

## Configuration Details

### Google OAuth
- **Issuer:** `https://accounts.google.com`
- **Scopes:** `openid profile email`
- **Token type sent to backend:** ID token
- **Audience validated against:** Google `clientId`
- **Note:** `dummyClientSecret` required by `angular-oauth2-oidc` for SPA code flow — not a real secret

### Microsoft Entra ID
- **Issuer:** `https://login.microsoftonline.com/common/v2.0` (common endpoint)
- **App registration:** Personal `etownjaywiki@outlook.com` account — not school tenant (school IT blocks tenant-level registration)
- **Supported accounts:** Organizational (@etown.edu) AND personal Microsoft accounts
- **Scopes:** `openid profile email`
- **Token type sent to backend:** Access token
- **`skipIssuerCheck: true`:** Required — common endpoint tokens have tenant-specific issuers
- **Backend `ValidateIssuer: false`:** Issuer validation disabled; security maintained via signature + audience validation

### Local (Email + Password)
- **Issuer:** `jaywiki-api` (backend-issued)
- **Algorithm:** HMAC-SHA256 with symmetric signing key
- **Signing key:** Stored in `.env` as `JWT_SIGNING_KEY` (min 32 chars), injected via `JwtSigningConfig` singleton
- **Token expiry:** 7 days
- **Password hashing:** BCrypt with default work factor

---

## Token Lifetime

| Provider | Token Type | Expiry | Refresh |
|----------|------------|--------|---------|
| Google | ID token | 1 hour | Via refresh token (6 months rolling) |
| Microsoft | Access token | 1 hour | Via refresh token (90 days) |
| Local | Backend JWT | 7 days | Re-login required |