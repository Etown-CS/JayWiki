# PROJECT SETUP GUIDE - JAYWIKI CAMPUS PORTFOLIO SYSTEM

---

## Table of Contents

- [PREREQUISITES CHECK (DO THIS FIRST!)](#prerequisites-check-do-this-first)
  - [School Email Verification](#school-email-verification)
  - [Required Software Installation](#required-software-installation)
  - [Account Setup](#account-setup)
- [PROJECT INITIALIZATION](#project-initialization)
  - [Phase 1: Create GitHub Repository](#phase-1-create-github-repository)
  - [Phase 2: Create Angular Frontend](#phase-2-create-angular-frontend)
  - [Phase 3: Create ASP.NET Core Backend](#phase-3-create-aspnet-core-backend)
  - [Phase 4: Setup Azure Resources](#phase-4-setup-azure-resources)
  - [Phase 5: Connect Everything Locally](#phase-5-connect-everything-locally)
  - [Phase 6: Setup GitHub Actions for Deployment](#phase-6-setup-github-actions-for-deployment)
  - [Phase 7: Configure OAuth Authentication](#phase-7-configure-oauth-authentication)
  - [Phase 8: Configure Local Auth (Email + Password)](#phase-8-configure-local-auth-email--password)
- [VERIFICATION CHECKLIST](#verification-checklist)
- [NEXT STEPS AFTER SETUP](#next-steps-after-setup)
- [TROUBLESHOOTING COMMON ISSUES](#troubleshooting-common-issues)
- [COST MANAGEMENT](#cost-management)
- [HELPFUL RESOURCES](#helpful-resources)

---

## PREREQUISITES CHECK (DO THIS FIRST!)

### School Email Verification

Before starting, verify your school email works with these services:

☐ **Step 1: Check Microsoft Account Access**
- Go to: https://portal.azure.com
- Try signing in with your school email
- ✓ Success = You have Microsoft account access
- ✗ Failure = Contact your IT department for Azure/Microsoft 365 access

☐ **Step 2: Check Azure for Students**
- Go to: https://azure.microsoft.com/en-us/free/students/
- Sign in with school email
- Check if you have $100 Azure credit
- ✓ Success = You can use Azure services for free
- ✗ Failure = You may need to use regular free tier or request access

☐ **Step 3: Check GitHub Education**
- Go to: https://education.github.com/
- Sign in with GitHub account
- Apply for GitHub Student Developer Pack
- Add your school email as verified email
- ✓ Success = Free GitHub Pro + additional tools
- ✗ Failure = Regular GitHub free tier works fine

☐ **Step 4: Verify Campus Microsoft Account Support**
- Ask IT department: "Does our campus use Microsoft Entra ID (Azure AD)?"
- Ask: "Can students register OAuth apps using campus credentials?"
- **Important:** If IT blocks tenant-level app registrations, use a personal Microsoft account (e.g., outlook.com) to register the app with the "common" endpoint — this still supports campus @etown.edu logins
- ✓ Campus IT allows app registration = Register under school tenant
- ✗ Blocked by IT = Register under personal Microsoft account using common endpoint (see Phase 7)

### Required Software Installation

☐ **1. Install Node.js (v18 or higher)**
- Download: https://nodejs.org/
- Version check: Open terminal, run: `node --version`
- Should show: v18.x.x or higher

☐ **2. Install Git**
- Download: https://git-scm.com/downloads
- Version check: `git --version`
- Should show: git version 2.x.x

☐ **3. Install Visual Studio Code**
- Download: https://code.visualstudio.com/
- Install these VS Code extensions:
  * Angular Language Service
  * C# (Microsoft)
  * Azure Tools
  * GitLens

☐ **4. Install .NET SDK (v10.0)**
- Download: https://dotnet.microsoft.com/download
- Version check: `dotnet --version`
- Should show: 10.0.x

☐ **5. Install Angular CLI**
- Run in terminal: `npm install -g @angular/cli`
- Version check: `ng version`
- Should show: Angular CLI 17.x.x or higher

☐ **6. Install GitHub Desktop (optional but recommended)**
- Download: https://desktop.github.com/
- Used for: Branch management, commits, PRs without CLI

☐ **7. Install Azure Data Studio or SSMS (optional but helpful)**
- Azure Data Studio: https://azure.microsoft.com/en-us/products/data-studio
- SSMS: https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
- Used for: Viewing and managing your database locally

### Account Setup

☐ **1. Create/Verify GitHub Account**
- Go to: https://github.com
- Sign up or sign in
- Add your school email to account settings
- Enable two-factor authentication (2FA)

☐ **2. Create Azure Account**
- Go to: https://portal.azure.com
- Sign in with your school email
- If prompted, complete Azure for Students signup
- Verify you can access Azure Portal dashboard

☐ **3. Setup Azure Subscription**
- In Azure Portal, click "Subscriptions"
- You should see "Azure for Students" or "Free Trial"
- Note your Subscription ID (you'll need this later)

---

## PROJECT INITIALIZATION

### Phase 1: Create GitHub Repository

☐ **1. Create New Repository**
- Go to your GitHub organization or personal account
- Create new repository: "JayWiki" (or your choice)
- Description: "Campus Portfolio Management System"
- Set to: Private
- ✓ Add README.md
- ✓ Add .gitignore (choose: VisualStudio)
- Click "Create repository"

☐ **2. Clone Repository Locally**
- Copy the repository URL
- Open terminal in your projects folder
- Run: `git clone https://github.com/YOUR-ORG/YOUR-REPO-NAME.git`
- Run: `cd YOUR-REPO-NAME`

### Phase 2: Create Angular Frontend

☐ **1. Create Angular Project**
- In your repo folder, run:
  ```bash
  ng new frontend --routing --style=css
  ```
- Choose:
  * Stylesheet format: CSS
  * Server-Side Rendering: No
  * Enable routing: Yes

☐ **2. Install Tailwind CSS**

> **⚠️ IMPORTANT: Tailwind CSS v4 is incompatible with Angular 17**
> You must install v3.4.1 specifically. Do NOT run `npm install tailwindcss` without pinning the version.

- Run: `cd frontend`
- Run: `npm install -D tailwindcss@3.4.1 postcss autoprefixer`
- Run: `npx tailwindcss init`

☐ **3. Test Angular App**
- Run: `ng serve`
- Open browser: http://localhost:4200
- ✓ Success = You should see Angular welcome page
- Press Ctrl+C to stop server

☐ **4. Install Additional Packages**
- Run: `npm install angular-oauth2-oidc`

### Phase 3: Create ASP.NET Core Backend

☐ **1. Create .NET Web API Project**
- In your repo root folder (not in frontend), run:
  ```bash
  dotnet new webapi -n Backend
  ```

☐ **2. Install Required NuGet Packages**
- Run: `cd Backend`
- Run: `dotnet add package Microsoft.EntityFrameworkCore`
- Run: `dotnet add package Microsoft.EntityFrameworkCore.SqlServer`
- Run: `dotnet add package Microsoft.EntityFrameworkCore.Tools`
- Run: `dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer`
- Run: `dotnet add package DotNetEnv`
- Run: `dotnet add package BCrypt.Net-Next`
- Run: `dotnet add package Azure.Storage.Blobs`
- Run: `dotnet add package Swashbuckle.AspNetCore`

☐ **3. Create a `.env` file in the repository root**

> **⚠️ IMPORTANT: The `.env` file belongs in the repository root — NOT inside `/Backend`.**
> Both `Program.cs` (backend) and `set-env.mjs` (frontend) look for it there.
> The backend checks the current working directory and one level up; `set-env.mjs` always reads from one level above `frontend/`.

- Add `.env` to your `.gitignore` — it must never be committed to version control
- Use `.env.example` as your template:

```env
# ── Database ────────────────────────────────────────────────────────
ConnectionStrings__DefaultConnection=your-connection-string

# ── Azure Blob Storage ───────────────────────────────────────────────
AZURE_BLOB_CONNECTION_STRING=your-blob-connection-string

# ── Auth — Backend ───────────────────────────────────────────────────
Authentication__Google__ClientId=your-google-client-id
Authentication__Microsoft__ClientId=your-microsoft-client-id
Authentication__Microsoft__TenantId=common

# ── Auth — Frontend (read by set-env.mjs) ────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_TENANT_ID=common
MICROSOFT_API_SCOPE=openid profile email

# ── JWT ──────────────────────────────────────────────────────────────
JWT_SIGNING_KEY=your-random-32-char-minimum-key

# ── Frontend ─────────────────────────────────────────────────────────
# ⚠️ This is required — set-env.mjs will exit with an error if missing
NG_API_BASE_URL=http://localhost:5227

# ── CORS ─────────────────────────────────────────────────────────────
Cors__AllowedOrigins__0=http://localhost:4200
```

> **⚠️ NOTE:** Environment variables use `__` (double underscore) as the separator and **always override** `appsettings.json`. If a value isn't loading, check `.env` first.

> **⚠️ NOTE:** `NG_API_BASE_URL` is required. The `set-env.mjs` pre-build script will exit immediately with an error if this variable is not set.

☐ **4. Test .NET API**
- Run: `dotnet run`
- Open browser: http://localhost:5227/swagger
- ✓ Success = You should see Swagger API documentation
- Press Ctrl+C to stop server

> **⚠️ NOTE:** Swashbuckle.AspNetCore v10 ships with Microsoft.OpenApi v2.0 which can cause the Swagger UI to fail or render incorrectly. If Swagger does not load, use [Postman](https://www.postman.com/) for API testing instead — all endpoints function correctly regardless.

### Phase 4: Setup Azure Resources

> **⚠️ IMPORTANT: Resource Group Region vs Resource Region**
>
> Resource Group Region is just metadata. It does **NOT** affect where your actual resources run. When creating resources, choose the **SAME** actual region for all of them to minimize latency.
>
> **Recommended:** Use East US 2 or West US 2 for all resources.

☐ **1. Create Resource Group**
- Go to Azure Portal: https://portal.azure.com
- Search for "Resource groups" → Click "+ Create"
- Name: "campus-portfolio-rg"
- Region: East US (metadata only)
- Click "Review + create" → "Create"

☐ **2. Create Azure SQL Database**
- Search "SQL databases" → Click "+ Create"
- Resource group: campus-portfolio-rg
- Database name: "campus-portfolio-db"
- Server: Create new server
  * Server name: campus-portfolio-server-[your-initials]
  * Admin login: sqladmin
  * Password: Create strong password, SAVE IT
  * Location: East US 2 (actual compute)
- Compute + storage: Basic (5 DTUs, 2GB)
- Click "Review + create" → "Create"
- ⚠️ After creation: Go to server firewall settings → Add client IP → Save

☐ **3. Get Database Connection String**
- Go to your database → "Connection strings" → Copy ADO.NET string
- Replace `{your_password}` with your actual password
- Add to your `.env` file

☐ **4. Create Azure Storage Account**
- Search "Storage accounts" → Click "+ Create"
- Resource group: campus-portfolio-rg
- Name: globally unique lowercase name
- Region: Same as SQL Server (East US 2)
- Performance: Standard, Redundancy: LRS
- Click "Review + create" → "Create"

☐ **5. Create Blob Containers**
- Go to Storage Account → Containers
- Create: `profile-images` (Blob public access)
- Create: `project-media` (Blob public access)
- Create: `event-media` (Blob public access)

> **Note:** Public blob access is required on all three containers so that uploaded image URLs can be used directly in `<img>` tags without expiring signed URLs.

### Phase 5: Connect Everything Locally

☐ **1. Add Connection String to `.env`**
```
ConnectionStrings__DefaultConnection=Server=tcp:your-server.database.windows.net,1433;Initial Catalog=your-db;...
```

☐ **2. Configure Entity Framework in `ApplicationDbContext.cs`**
- Create `Data/ApplicationDbContext.cs`
- Register all entity DbSets
- Configure relationships and constraints in `OnModelCreating`

☐ **3. Load `.env` in `Program.cs`**
```csharp
var cwd = Directory.GetCurrentDirectory();
foreach (var path in new[] { Path.Combine(cwd, ".env"), Path.Combine(cwd, "..", ".env") })
{
    if (File.Exists(path)) { DotNetEnv.Env.Load(path); break; }
}
```

☐ **4. Remove `app.UseHttpsRedirection()` from `Program.cs`**

> **⚠️ CRITICAL:** Azure App Service handles SSL termination at the load balancer level. If `UseHttpsRedirection()` is left in, it creates redirect loops in production. Remove it entirely — HTTPS is still enforced by Azure.

☐ **5. Configure CORS in `Program.cs`**
- Read allowed origins from config
- Apply `AllowFrontend` policy
- Place `app.UseCors()` BEFORE `app.UseAuthentication()`

☐ **6. Run EF Migrations**
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### Phase 6: Setup GitHub Actions for Deployment

☐ **1. Create App Service for Backend API**
- Search "App Services" → Click "+ Create"
- Resource group: campus-portfolio-rg
- Name: "jaywiki-api-[your-initials]"
- Publish: Code
- Runtime stack: .NET 10
- Operating System: Linux
- Region: Same as SQL Server (East US 2)
- Pricing plan: Basic B1 (recommended — F1 sleeps after 20 min inactivity)
- Click "Review + create" → "Create"

☐ **2. Add App Settings to App Service**
- Go to App Service → Configuration → Application Settings
- Add all secrets from `.env` as Application Settings (these override `appsettings.json` in production)
- Key secrets to add: `ConnectionStrings__DefaultConnection`, `Authentication__Google__ClientId`, `Authentication__Microsoft__ClientId`, `JWT_SIGNING_KEY`, `AZURE_BLOB_CONNECTION_STRING`, `Cors__AllowedOrigins__0`

☐ **3. Connect Backend to GitHub**
- Go to App Service → Deployment Center
- Source: GitHub → Authorize
- Select your org, repo, branch: main
- Build provider: GitHub Actions → Save
- ✓ Creates a backend workflow file in `.github/workflows/` automatically

☐ **4. Create Static Web App for Frontend**
- Search "Static Web Apps" → Click "+ Create"
- Resource group: campus-portfolio-rg
- Name: "campus-portfolio-frontend"
- Plan type: Free
- Source: GitHub → Select your repo → Branch: main
- Build presets: Angular
- App location: /frontend
- Output location: `dist/frontend/browser`

> **⚠️ IMPORTANT:** Angular 17+ with the `@angular/build:application` builder outputs to `dist/[project]/browser`, NOT `dist/[project]`. Using the wrong output location will deploy an empty app.

- Click "Review + create" → "Create"

☐ **5. Add Frontend Environment Secrets to GitHub**
- Go to your repository → Settings → Secrets and variables → Actions
- Add the following secrets (used by the Static Web Apps workflow at build time):
  * `GOOGLE_CLIENT_ID`
  * `GOOGLE_CLIENT_SECRET` (dummy value — required by `angular-oauth2-oidc`, never sent to Google)
  * `MICROSOFT_CLIENT_ID`
  * `MICROSOFT_TENANT_ID`
  * `MICROSOFT_API_SCOPE`
  * `NG_API_BASE_URL` (your production backend URL)

☐ **6. Test Automatic Deployment**
```bash
git add .
git commit -m "Test deployment"
git push origin main
```
- Go to GitHub → Actions tab → Watch workflows
- ✓ Success = Both workflows show green checkmarks

### Phase 7: Configure OAuth Authentication

> **⚠️ CRITICAL: Authentication Approach**
>
> **DO NOT use Azure AD B2C** — requires tenant admin permissions students typically don't have.
> **DO NOT use Auth0** — adds third-party dependency, complicates IT handoff.
> **✓ USE: Direct OAuth with `angular-oauth2-oidc`** — no special permissions, works with both campus and personal accounts.

#### Google OAuth Setup

☐ **1. Create Google OAuth App**
- Go to: https://console.cloud.google.com
- APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
- Application type: Web application
- Authorized JavaScript origins: `http://localhost:4200`
- Authorized redirect URIs: `http://localhost:4200/index.html`
- Save your Client ID

> **Note:** `angular-oauth2-oidc` requires a `dummyClientSecret` for SPA code flows even though Google doesn't actually use it. Set it to any non-empty string in your environment config.

#### Microsoft OAuth Setup

☐ **2. Create Microsoft App Registration**
- Go to: https://portal.azure.com → App registrations → New registration
- Name: "JayWiki"
- Supported account types: **Accounts in any organizational directory AND personal Microsoft accounts**
- Redirect URI: Single-page application (SPA) → `http://localhost:4200/index.html`
- Click "Register"
- Copy Application (client) ID

> **Note:** Use the `common` endpoint (`https://login.microsoftonline.com/common/v2.0`) to support both campus and personal Microsoft accounts. Set `skipIssuerCheck: true` in frontend config and `ValidateIssuer: false` in backend — tokens from the common endpoint have tenant-specific issuers that don't match the common issuer URL. Security is maintained via signature and audience validation.

#### Backend JWT Configuration

☐ **3. Configure triple JWT Bearer schemes in `Program.cs`**
- "Google" scheme: validates ID tokens against Google clientId
- "Microsoft" scheme: validates access tokens via common endpoint, `ValidateIssuer: false`
- "Local" scheme: validates backend-issued JWTs using `JWT_SIGNING_KEY`
- Policy-based `MultiScheme` selector inspects `iss` claim to route to correct scheme

☐ **4. Protect API Routes**
- Add `[Authorize]` to controllers
- Add `[AllowAnonymous]` to public endpoints

#### Production OAuth Setup

☐ **5. Update OAuth Redirect URIs for Production**
- Google Cloud Console → Authorized redirect URIs: add `https://YOUR-APP.azurestaticapps.net/index.html`
- Azure App Registration → Authentication: add same URL as SPA redirect URI

### Phase 8: Configure Local Auth (Email + Password)

☐ **1. Generate a JWT Signing Key**
- Must be minimum 32 characters
- Generate in PowerShell:
  ```powershell
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
  ```
- Or in terminal:
  ```bash
  openssl rand -base64 32
  ```
- Add to `.env`: `JWT_SIGNING_KEY=your-generated-key`
- Add to Azure App Service Application Settings with the same key

☐ **2. Create `Models/JwtSigningConfig.cs`**
```csharp
public class JwtSigningConfig
{
    public string SigningKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
}
```

☐ **3. Register in `Program.cs`**
```csharp
builder.Services.AddSingleton(new JwtSigningConfig
{
    SigningKey = localSigningKey,
    Issuer     = "jaywiki-api",
    Audience   = "jaywiki-app"
});
```

☐ **4. Create `AuthController.cs`**
- `POST /api/auth/register` — create account, return JWT
- `POST /api/auth/login` — verify BCrypt hash, return JWT
- `POST /api/auth/link` — link local identity to existing authenticated account

☐ **5. Update Angular interceptor**
- Check `sessionStorage auth_provider`
- If `"local"` → read token from `localStorage local_token`
- If `"google"` → read ID token from `angular-oauth2-oidc`
- If `"microsoft"` → read access token from `angular-oauth2-oidc`

---

## VERIFICATION CHECKLIST

### Backend Working:
☐ `dotnet run` starts without errors
☐ Swagger loads at `http://localhost:5227/swagger` (or use Postman if Swagger fails — see Swashbuckle note above)
☐ Database connection works (check terminal for EF errors)
☐ `POST /api/users/me` creates user + identity rows in DB
☐ Deployed to Azure App Service
☐ API accessible via Azure URL

### Frontend Working:
☐ `ng serve` starts without errors
☐ Angular app loads at `http://localhost:4200`
☐ Tailwind CSS styling works
☐ Deployed to Azure Static Web Apps
☐ Frontend accessible via Azure URL

### Authentication Working:
☐ Google OAuth login succeeds → user row created in DB
☐ Microsoft OAuth login succeeds → user row created in DB
☐ Local register creates user + BCrypt hash in DB
☐ Local login returns JWT token
☐ All three providers navigate to dashboard after login
☐ `GET /api/users/me` returns correct user for each provider

### Integration Working:
☐ Frontend can call backend API (no CORS errors)
☐ Auth interceptor attaches correct Bearer token per provider
☐ Protected endpoints return 401 without token
☐ Protected endpoints return 403 for unauthorized users

### DevOps Working:
☐ Push to main triggers automatic deployment
☐ Both workflows show green checkmarks in GitHub Actions
☐ Production app uses Azure App Settings (not `.env`)

---

## NEXT STEPS AFTER SETUP

Once the checklist is complete:

- Build API controllers (Projects, Courses, Events, Socials, Awards)
- Create Angular components (dashboard, profile, project detail pages)
- Implement file upload to Azure Blob Storage
- Style with Tailwind CSS
- Write unit and integration tests
- Deploy to production and verify end-to-end

---

## TROUBLESHOOTING COMMON ISSUES

### Issue: "Cannot connect to Azure SQL Database"
- Check firewall rules — add your IP in Azure Portal
- Verify connection string is correct in `.env`
- Check if password contains special characters that need escaping

### Issue: "GitHub Actions deployment fails"
- Check workflow logs in GitHub Actions tab
- Verify Azure credentials are set as GitHub Secrets
- For Angular: confirm output location is `dist/frontend/browser` not `dist/frontend`

### Issue: "CORS errors in browser console"
- Check `.env` — `Cors__AllowedOrigins__0` overrides `appsettings.json`
- Confirm `app.UseCors()` is before `app.UseAuthentication()` in `Program.cs`
- Restart backend after any config changes

### Issue: "Authentication not working (OAuth)"
- Verify redirect URIs match EXACTLY in Google/Microsoft console
- For Microsoft: confirm redirect URI type is "Single-page application (SPA)" not "Web"
- For Microsoft: confirm `skipIssuerCheck: true` in frontend, `ValidateIssuer: false` in backend
- Clear browser cache and cookies between attempts

### Issue: "Authentication not working (Local)"
- Confirm `JWT_SIGNING_KEY` is set in `.env` (min 32 chars)
- Confirm `sessionStorage auth_provider` is set to `"local"` after login
- Confirm interceptor reads `localStorage local_token` for local provider

### Issue: "`set-env.mjs` fails with 'NG_API_BASE_URL is not set'"
- Confirm `.env` exists in the repository root (not inside `/Backend` or `/frontend`)
- Confirm `NG_API_BASE_URL` is present and not empty

### Issue: "Swagger 500 error on startup (IFormFile)"
- If you have a file upload endpoint: wrap `IFormFile` in a class instead of using it directly as a parameter
- Add `[Consumes("multipart/form-data")]` to the file upload endpoint only — not the whole controller

### Issue: "Swagger UI fails to load or generates errors (not IFormFile-related)"
- This is a known breaking change in Swashbuckle.AspNetCore v10 with Microsoft.OpenApi v2.0
- Use [Postman](https://www.postman.com/) for API testing instead — all endpoints function correctly

### Issue: "Azure AD B2C setup failing"
- Stop — do not use B2C unless IT confirmed you have tenant admin access
- Switch to direct OAuth via `angular-oauth2-oidc` with the common endpoint (see Phase 7)

### Issue: "App Service taking 30+ seconds to load"
- Normal for Free F1 tier — app sleeps after 20 min inactivity
- Upgrade to Basic B1 to eliminate cold starts

### Issue: "`app.UseHttpsRedirection()` causing redirect loops in production"
- Remove it from `Program.cs` — Azure handles SSL termination at the load balancer
- HTTPS is still enforced; this middleware is redundant and harmful on Azure

---

## COST MANAGEMENT

### Recommended Setup (B1 for production quality):
- Azure App Service B1: ~$13/month
- Azure SQL Database Basic (5 DTUs): ~$5/month
- Azure Blob Storage: ~$0.50/month
- Static Web Apps: **Free**
- OAuth (all 3 providers): **Free**
- **Total: ~$18.50/month** — within $100 Azure student credit for 5+ months

### Budget Setup (F1 for pure development):
- Azure App Service F1: **$0/month** (cold starts after 20 min idle)
- Azure SQL Database Basic: ~$5/month
- Azure Blob Storage: ~$0.50/month
- **Total: ~$5.50/month**

### Tips:
- Set up cost alerts in Azure Portal
- Co-locate all resources in the same region to avoid data transfer costs
- Delete unused resources when not actively developing

---

## HELPFUL RESOURCES

### Documentation:
- Angular: https://angular.dev/docs
- ASP.NET Core: https://docs.microsoft.com/en-us/aspnet/core/
- Entity Framework Core: https://docs.microsoft.com/en-us/ef/core/
- angular-oauth2-oidc: https://github.com/manfredsteyer/angular-oauth2-oidc
- Google Cloud Console: https://console.cloud.google.com
- Microsoft App Registration: https://portal.azure.com
- Azure Blob Storage SDK: https://docs.microsoft.com/en-us/azure/storage/blobs/

### Support:
- Stack Overflow: https://stackoverflow.com
- GitHub Issues (for specific packages)
- School IT department (for campus Microsoft account support)

### See Also:
- `LESSONS_LEARNED.md` — gotchas, surprises, and non-obvious decisions encountered during development
- `Docs/ERD/DB_SCHEMA.md` — full entity relationship diagram and schema documentation
- `oauthauthenticationflow.md` — detailed authentication flow diagrams for all three providers
- `systemarchitecture.md` — system architecture and Azure infrastructure overview