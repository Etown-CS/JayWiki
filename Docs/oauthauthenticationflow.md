# Authentication Flow Diagram

This diagram shows the OAuth 2.0 authentication flows for both Microsoft Entra ID (campus users) and Google OAuth (external users). The angular-oauth2-oidc library handles frontend token acquisition, while ASP.NET Core JWT Bearer middleware validates tokens on the backend.

## Complete OAuth Flow (Google or Microsoft)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Web Browser
    participant Frontend as Angular Frontend<br/>(angular-oauth2-oidc)
    participant Google as Google OAuth 2.0
    participant Microsoft as Microsoft Entra ID<br/>(Campus SSO)
    participant Backend as ASP.NET Core API<br/>(JWT Bearer Middleware)
    participant DB as Azure SQL Database

    Note over User,DB: User initiates login

    User->>Browser: Click "Login with Google" or "Login with Microsoft"
    Browser->>Frontend: Trigger OAuth login
    
    alt Google OAuth Flow
        Frontend->>Google: Redirect to Google OAuth<br/>(client_id, redirect_uri, scopes)
        Google->>User: Present Google login page
        User->>Google: Enter credentials & consent
        Google->>Frontend: Redirect with ID token<br/>(JWT containing user claims)
    else Microsoft Entra ID Flow
        Frontend->>Microsoft: Redirect to Microsoft OAuth<br/>(client_id, redirect_uri, scopes)
        Microsoft->>User: Present Microsoft login page<br/>(@etown.edu or personal account)
        User->>Microsoft: Enter credentials & consent
        Microsoft->>Frontend: Redirect with access token<br/>(JWT containing user claims)
    end

    Note over Frontend: Token stored in browser<br/>(localStorage or sessionStorage)

    Frontend->>Backend: API request with JWT token<br/>(Authorization: Bearer <token>)
    
    Backend->>Backend: Inspect 'iss' claim<br/>(issuer: Google or Microsoft?)
    
    alt Token from Google
        Backend->>Google: Validate token signature<br/>& check expiration
        Google-->>Backend: Token valid ✓
    else Token from Microsoft
        Backend->>Microsoft: Validate token signature<br/>& check expiration
        Microsoft-->>Backend: Token valid ✓
    end

    Backend->>Backend: Extract user claims<br/>(email, name, provider)
    
    Backend->>DB: Check if user exists<br/>(SELECT * FROM Users WHERE Email = ?)
    
    alt User exists
        DB-->>Backend: Return user profile
        Backend->>Browser: Return user data (HTTP 200)
    else First-time login
        Backend->>DB: Create new user<br/>(INSERT INTO Users)
        DB-->>Backend: New user created (UserId)
        Backend->>Browser: Return new user profile (HTTP 201)
    end

    Browser->>Frontend: Update UI with user profile
    Frontend->>User: Redirect to dashboard<br/>(authenticated session)

    Note over User,DB: Subsequent API requests include JWT token
```

## Detailed Flow Explanation

### Phase 1: OAuth Provider Selection (Steps 1-2)
- User clicks login button choosing Google or Microsoft
- Frontend initiates OAuth flow with selected provider

### Phase 2: OAuth Provider Authentication (Steps 3-6)
**For Google:**
- Frontend redirects to `accounts.google.com` with client_id and scopes
- User authenticates and grants consent
- Google returns ID token (JWT) to frontend via redirect URI

**For Microsoft Entra ID:**
- Frontend redirects to `login.microsoftonline.com` with client_id and scopes
- User authenticates with @etown.edu campus credentials or personal Microsoft account
- Microsoft returns access token (JWT) to frontend via redirect URI

### Phase 3: Token Storage (Step 7)
- angular-oauth2-oidc library stores token in browser storage
- Token persists across page refreshes
- Token includes expiration time for automatic refresh

### Phase 4: Backend API Request (Step 8)
- Frontend includes JWT in Authorization header: `Bearer <token>`
- All protected endpoints require valid token

### Phase 5: Token Validation (Steps 9-12)
- Backend inspects `iss` (issuer) claim to determine provider
- Policy-based scheme selector routes to appropriate validation endpoint
- Token signature verified using provider's public keys
- Token expiration checked

### Phase 6: User Provisioning (Steps 13-17)
- Extract email, name, and provider from token claims
- Check if user exists in database by email
- **If existing user:** Return user profile
- **If new user:** Create user record via `POST /api/users/me` endpoint
- Return user data to frontend

### Phase 7: Session Establishment (Steps 18-19)
- Frontend updates UI with user profile information
- User redirected to authenticated dashboard
- Subsequent requests automatically include token

## Token Refresh Flow

```mermaid
sequenceDiagram
    participant Frontend as Angular Frontend
    participant Provider as OAuth Provider<br/>(Google or Microsoft)
    participant Backend as ASP.NET Core API

    Note over Frontend: Token approaching expiration<br/>(detected by angular-oauth2-oidc)

    Frontend->>Provider: Silent token refresh request<br/>(using refresh token)
    Provider-->>Frontend: New access token
    Frontend->>Frontend: Update stored token
    Frontend->>Backend: Continue API requests<br/>with new token
```

## Error Handling Scenarios

```mermaid
flowchart TD
    Start([API Request with Token]) --> Validate{Token Valid?}
    
    Validate -->|Missing Token| E401A[HTTP 401 Unauthorized<br/>Redirect to login]
    Validate -->|Expired Token| E401B[HTTP 401 Unauthorized<br/>Trigger token refresh]
    Validate -->|Invalid Signature| E401C[HTTP 401 Unauthorized<br/>Clear session, redirect to login]
    Validate -->|Modified Claims| E401D[HTTP 401 Unauthorized<br/>Potential security breach]
    Validate -->|Valid Token| CheckUser{User Exists?}
    
    CheckUser -->|Yes| Success[HTTP 200 OK<br/>Return user data]
    CheckUser -->|No, First Login| CreateUser[HTTP 201 Created<br/>Provision new user]
    CheckUser -->|Database Error| E500[HTTP 500 Internal Server Error<br/>Log error, retry]
    
    style E401A fill:#FF6B6B
    style E401B fill:#FF6B6B
    style E401C fill:#FF6B6B
    style E401D fill:#FF6B6B
    style E500 fill:#FFA500
    style Success fill:#50C878
    style CreateUser fill:#50C878
```

## Security Features

### Frontend (angular-oauth2-oidc)
- **PKCE (Proof Key for Code Exchange):** Prevents authorization code interception
- **State Parameter:** Prevents CSRF attacks during OAuth callback
- **Token Storage:** Secure storage in browser (with HttpOnly cookie option)
- **Automatic Refresh:** Handles token expiration seamlessly

### Backend (ASP.NET Core JWT Bearer)
- **Dual Authentication Schemes:** Separate validation for Google and Microsoft
- **Issuer Validation:** Verifies token came from trusted provider
- **Audience Validation:** Ensures token intended for this API
- **Signature Verification:** Cryptographically validates token authenticity
- **Expiration Check:** Rejects expired tokens
- **Claims Extraction:** Type-safe access to user information

## Configuration Details

### Google OAuth Configuration
- **Issuer:** `https://accounts.google.com`
- **Client ID:** Stored in Angular environment configuration
- **Scopes:** `openid profile email`
- **Token Type:** ID Token (JWT)
- **Validation Endpoint:** `https://oauth2.googleapis.com/tokeninfo`

### Microsoft Entra ID Configuration
- **Issuer:** `https://login.microsoftonline.com/{tenant}/v2.0`
- **Client ID:** Application ID from Azure App Registration
- **Tenant ID:** Elizabethtown College Azure tenant
- **Scopes:** `openid profile email`
- **Token Type:** Access Token (JWT)
- **Validation Endpoint:** Microsoft common endpoint with public keys

## Token Lifetime Settings

| Provider | Access Token | Refresh Token | ID Token |
|----------|--------------|---------------|----------|
| Google | 1 hour | 6 months (rolling) | 1 hour |
| Microsoft | 1 hour | 90 days (configurable) | 1 hour |

**Note:** Tokens automatically refresh before expiration using refresh tokens, maintaining seamless user experience.