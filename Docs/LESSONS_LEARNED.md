# Lessons Learned — JayWiki Development
 
This document captures non-obvious technical decisions, gotchas, and surprises encountered during development. It exists so that whoever maintains or extends this project doesn't have to rediscover these the hard way.
 
---
 
## Authentication
 
### 1. Azure AD B2C is blocked by school IT
**What happened:** Initial plan was to use Azure AD B2C for multi-provider auth. School IT does not grant students tenant-level admin permissions required to create B2C tenants.
 
**Resolution:** Switched to direct OAuth via `angular-oauth2-oidc` using Google Cloud Console and Microsoft Entra ID app registrations directly. No special IT permissions required. Works equally well.
 
**Lesson:** Do not invest time in B2C unless IT confirms you have tenant admin access first.
 
---
 
### 2. Microsoft common endpoint requires `skipIssuerCheck: true`
**What happened:** Microsoft's `common` endpoint supports both organizational and personal Microsoft accounts. Tokens from the common endpoint have tenant-specific issuers (e.g., `https://login.microsoftonline.com/{tenant-id}/v2.0`) that never match the common endpoint issuer URL. `angular-oauth2-oidc` performs issuer validation by default and rejects all Microsoft tokens.
 
**Resolution:** Set `skipIssuerCheck: true` in the frontend Microsoft `AuthConfig`. On the backend, set `ValidateIssuer: false` in the Microsoft JWT Bearer scheme's `TokenValidationParameters`. Security is still maintained via cryptographic signature verification and audience validation.
 
**Lesson:** This setting must always be enabled for Microsoft common endpoint — not just in development.
 
---
 
### 3. Google SPA flow requires `dummyClientSecret`
**What happened:** `angular-oauth2-oidc` internally requires a `clientSecret` field even for SPA (public client) flows where no secret exists. Leaving it empty causes the library to fail silently.
 
**Resolution:** Set `dummyClientSecret` to any non-empty string in the Google `AuthConfig`. Google's OAuth security relies on redirect URI validation and PKCE — the secret value is never used or sent.
 
**Lesson:** This is a quirk of the library, not a security concern.
 
---
 
### 4. Race condition on concurrent first logins
**What happened:** On first login, the backend checks if a user exists and creates one if not. Under concurrent requests (e.g., double-click on login), two requests can both pass the existence check before either insert completes, causing a SQL unique constraint violation on the second insert.
 
**Resolution:** Wrapped `SaveChangesAsync()` in a try-catch for SQL error codes 2601 (unique index violation) and 2627 (unique constraint violation). On catch, re-query for the concurrently created user and return it instead of throwing.
 
**Lesson:** Any "check then insert" pattern on a unique column needs race condition protection.
 
---
 
### 5. Microsoft tokens don't always include the `email` claim
**What happened:** Microsoft Entra ID tokens frequently omit the `email` claim even when `email` scope is requested, depending on account type and tenant configuration.
 
**Resolution:** Email resolution falls through multiple claims in order: `email` → `preferred_username` → `upn` → `ClaimTypes.Upn`. This covers both organizational and personal Microsoft accounts.
 
**Lesson:** Never assume `email` claim is present in Microsoft tokens. Always implement a fallback chain.
 
---
 
### 6. `GetCurrentUserAsync()` must scope by provider AND email
**What happened:** `UserIdentity` has a unique constraint on (Provider, ProviderEmail), meaning the same email address can legitimately exist under multiple providers. A lookup by email alone can return the wrong user.
 
**Resolution:** Derive the provider from the token's `iss` claim, then query `UserIdentities` by both `Provider` AND `ProviderEmail`.
 
**Lesson:** Never look up a user by email alone in a multi-provider identity model.
 
---
 
### 7. BCrypt dummy hash must be static
**What happened:** The login endpoint originally called `BCrypt.HashPassword("dummy")` inline when no matching identity was found, to prevent timing-based user enumeration. BCrypt is intentionally slow (~100-300ms) — calling it on every failed login attempt creates a CPU DoS vector.
 
**Resolution:** Compute a single static dummy hash at class initialization (`private static readonly string _dummyHash = BCrypt.HashPassword(...)`). Reuse it on every failed lookup. Timing behavior is preserved without the CPU cost.
 
**Lesson:** BCrypt's slowness is a feature for security but a liability if called unnecessarily in hot paths.
 
---
 
## Infrastructure & Deployment
 
### 8. `app.UseHttpsRedirection()` breaks Azure deployment
**What happened:** Azure App Service handles SSL termination at the load balancer. The app receives traffic over HTTP internally. `UseHttpsRedirection()` sees HTTP and issues a redirect to HTTPS, creating an infinite redirect loop.
 
**Resolution:** Remove `app.UseHttpsRedirection()` from `Program.cs` entirely. Azure enforces HTTPS at the infrastructure level — this middleware is redundant and harmful in Azure-hosted environments.
 
**Lesson:** Remove `UseHttpsRedirection()` for any Azure App Service deployment.
 
---
 
### 9. Angular 17+ build output goes to `dist/[project]/browser`
**What happened:** Angular 17 switched to the `@angular/build:application` builder, which outputs to `dist/[project]/browser` instead of the old `dist/[project]`. Azure Static Web Apps configured with the old output path deploys successfully but serves a blank page.
 
**Resolution:** Set the output location in the Static Web App configuration (and GitHub Actions workflow) to `dist/frontend/browser`.
 
**Lesson:** Always check the actual build output directory after upgrading Angular or changing build configuration.
 
---
 
### 10. CORS environment variable overrides `appsettings.json`
**What happened:** `appsettings.json` had `Cors:AllowedOrigins` set correctly to `http://localhost:4200`. CORS errors persisted in the browser. The `.env` file had `Cors__AllowedOrigins__0=http://localhost:5227` (the backend URL, not the frontend). Environment variables loaded via `DotNetEnv` always override `appsettings.json`.
 
**Resolution:** Corrected the `.env` value to `http://localhost:4200`.
 
**Lesson:** When debugging config issues, check `.env` first — environment variables always win over `appsettings.json`.
 
---
 
### 11. Resource group region is just metadata
**What happened:** Assumed that the resource group region determined where resources ran and created resources in different regions by mistake (App Service in East US, SQL in West US 2), adding ~60-80ms cross-region latency.
 
**Resolution:** Resource group region is only where Azure stores management metadata. Actual compute resources each have their own region setting. Co-locate all resources (App Service, SQL, Blob Storage) in the same region.
 
**Lesson:** Always explicitly set the region on each resource — don't assume it inherits from the resource group.
 
---
 
### 12. App Service Free F1 sleeps after 20 minutes
**What happened:** Free F1 App Service tier puts the app to sleep after 20 minutes of inactivity. First request after idle takes 10-30 seconds to wake up. This looks like a bug but is normal F1 behavior.
 
**Resolution:** Upgraded to Basic B1 tier for development/demo to eliminate cold starts.
 
**Lesson:** Use F1 only for initial setup/testing. Switch to B1 before any demo or shared use.
 
---
 
## Schema & Entity Framework
 
### 13. EF Core can't auto-detect non-standard primary key names
**What happened:** EF Core automatically detects primary keys named `Id` or `[EntityName]Id`. Keys named differently (e.g., `CatalogId` on `CourseCatalog`, `IdentityId` on `UserIdentity`) are not recognized and cause a migration error: "requires a primary key to be defined."
 
**Resolution:** Explicitly configure non-standard primary keys in `OnModelCreating`:
```csharp
entity.HasKey(e => e.CatalogId);
```
 
**Lesson:** If your PK name doesn't follow the `Id` or `[ClassName]Id` convention, always configure it explicitly.
 
---
 
### 14. `CLASS` is a reserved keyword in Mermaid ERD syntax
**What happened:** The original schema used `CLASS` as an entity name. Mermaid ERD diagrams treat `CLASS` as a reserved keyword and fail to render.
 
**Resolution:** Renamed the entity to `COURSE` throughout the schema, models, and documentation.
 
**Lesson:** Check Mermaid reserved keywords before naming entities. Other reserved words include `style`, `end`, `graph`.
 
---
 
### 15. Multiple cascade paths cause SQL Server errors
**What happened:** SQL Server does not allow multiple cascade delete paths to the same table. `Project` has both `UserId` and `CourseId` as foreign keys — both USER and COURSE could cascade delete to PROJECT, creating two cascade paths.
 
**Resolution:** Set both `Project.UserId` and `Project.CourseId` relationships to `DeleteBehavior.NoAction` in `OnModelCreating`. Handle cascades at the application layer instead.
 
**Lesson:** Any entity with multiple FKs to the same parent table hierarchy will likely hit this. Use `NoAction` and handle cleanup manually.
 
---
 
### 16. Swashbuckle fails on `IFormFile` parameters
**What happened:** Using `[FromForm] IFormFile file` directly as a controller parameter causes Swashbuckle to throw a 500 error when generating the Swagger schema: "Error reading parameter(s) as [FromForm] attribute used with IFormFile."
 
**Resolution:** Wrap `IFormFile` in a class:
```csharp
public class ProfileImageUploadRequest
{
    public IFormFile File { get; set; } = null!;
}
```
Then use `[FromForm] ProfileImageUploadRequest request`. Also add `[Consumes("multipart/form-data")]` to the endpoint (not the whole controller).
 
**Lesson:** Swashbuckle handles `IFormFile` wrapped in a class but not as a raw parameter.
 
---
 
### 17. Swashbuckle v10 ships with a breaking change in Microsoft.OpenApi
**What happened:** Swashbuckle.AspNetCore v10 ships with Microsoft.OpenApi v2.0, which breaks the standard `Microsoft.OpenApi.Models` namespace used by most documentation and extension code. The Swagger UI may fail to load or generate incorrect schemas even after fixing the `IFormFile` issue above.
 
**Resolution:** Use Postman for API testing instead of Swagger UI. The backend endpoints all function correctly — Swagger is the only thing affected.
 
**Lesson:** Swashbuckle v10+ and Microsoft.OpenApi v2.0 are not drop-in compatible with older Swagger extension code. Check release notes before upgrading. If Swagger breaks, Postman is a reliable fallback.
 
---
 
## Frontend
 
### 18. Tailwind CSS v4 is incompatible with Angular 17
**What happened:** Installing the latest Tailwind CSS (v4) breaks the Angular 17 build system. Build fails with errors related to the PostCSS configuration.
 
**Resolution:** Pin to Tailwind CSS v3.4.1:
```bash
npm install -D tailwindcss@3.4.1 postcss autoprefixer
```
 
**Lesson:** Always check Angular + Tailwind version compatibility before installing. v4 requires Angular 18+ with a different setup process.
 
---
 
### 19. `tryRestoreSession()` must not be called twice on app init
**What happened:** Calling `tryRestoreSession()` twice during app initialization (e.g., in both `APP_INITIALIZER` and a route guard) causes a race condition where the second call runs before the first completes. Both calls attempt to process the OAuth callback code, and the second fails because the authorization code has already been consumed.
 
**Resolution:** Call `tryRestoreSession()` exactly once, in a single `APP_INITIALIZER`. Route guards should check `authService.isLoggedIn` (a synchronous property) rather than triggering another session restore.
 
**Lesson:** Authorization code exchange is a one-time operation. Duplicate calls will always fail on the second attempt.
 
---
 
### 20. `POST /api/users/me` must be called by the frontend after OAuth login
**What happened:** After OAuth completes and the token is stored, the user record is not automatically created in the database. The backend only creates it when `POST /api/users/me` is explicitly called.
 
**Resolution:** Added `upsertUser()` call inside `tryRestoreSession()` immediately after `isLoggedIn` is confirmed, before navigating to the dashboard.
 
**Lesson:** OAuth gives you a token — user provisioning is a separate step that the frontend must explicitly trigger.
 
---
 
### 21. Local auth tokens must use a different localStorage key than `angular-oauth2-oidc`
**What happened:** `angular-oauth2-oidc` uses `access_token` as its localStorage key. Storing the local JWT under `access_token` gets overwritten or causes conflicts with the library's own token management.
 
**Resolution:** Store local JWTs under `local_token` in localStorage. The HTTP interceptor checks `sessionStorage auth_provider` to determine which key to read from.
 
**Lesson:** Never use the same storage keys as third-party auth libraries. Always use a distinct namespace.
 
---
 
### 22. `Promise.allSettled` with `async/await` in Angular can freeze loading state
**What happened:** Using `Promise.allSettled` inside an `async` Angular lifecycle hook caused the loading state to never clear. The component's loading spinner persisted indefinitely after data had loaded because Angular's zone.js change detection did not fire after the awaited calls completed.
 
**Resolution:** Replace `Promise.allSettled` with RxJS `forkJoin` combined with `catchError(() => of([]))` per stream. Call `cdr.detectChanges()` explicitly in the `finally` block as a safety net.
 
**Lesson:** When using `async/await` in Angular lifecycle hooks, change detection may not fire automatically. Use `forkJoin` with `catchError` instead of `Promise.allSettled`, and always call `cdr.detectChanges()` in `finally`.
 
---
 
### 23. `ngModel` requires `FormsModule` in standalone components
**What happened:** Adding `[(ngModel)]` to an input in a standalone component caused a template compilation error. The directive was not recognized because `FormsModule` was not imported.
 
**Resolution:** Add `FormsModule` to the `imports` array of any standalone component that uses `[(ngModel)]`.
 
**Lesson:** Standalone components do not inherit module imports. Every directive dependency — including built-ins like `FormsModule` — must be explicitly imported in the component.
 
---
 
### 24. Arrow functions cannot be used in Angular template expressions
**What happened:** Using an arrow function inside an Angular template interpolation or binding (e.g., `{{ items.filter(i => i.active) }}`) caused a template compilation error.
 
**Resolution:** Move the logic into a component method or getter and call that from the template instead.
 
**Lesson:** Angular's template compiler does not support arrow functions in expressions. Always extract logic into component methods or getters.
 