# PROJECT SETUP GUIDE - MICROSOFT CAMPUS PROJECT

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
  - [Phase 7: Configure Authentication](#phase-7-configure-authentication)
- [VERIFICATION CHECKLIST](#verification-checklist)
- [NEXT STEPS AFTER SETUP](#next-steps-after-setup)
- [TROUBLESHOOTING COMMON ISSUES](#troubleshooting-common-issues)
- [COST MANAGEMENT](#cost-management)
- [HELPFUL RESOURCES](#helpful-resources)
- [WHEN YOU'RE READY TO START CODING](#when-youre-ready-to-start-coding)

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

☐ **Step 4: Verify Campus SSO (Single Sign-On)**
- Ask IT department: "Does our campus use Microsoft Entra ID (Azure AD)?"
- Ask: "Can students authenticate apps using campus credentials?"
- Note: This project uses angular-oauth2-oidc which supports both Microsoft (campus) AND Google login
- ✓ Campus has SSO = You can integrate campus authentication
- ✗ No campus SSO = OAuth still works with Google/Microsoft accounts

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

☐ **4. Install .NET SDK (v8.0)**
- Download: https://dotnet.microsoft.com/download
- Version check: `dotnet --version`
- Should show: 8.0.x

☐ **5. Install Angular CLI**
- Run in terminal: `npm install -g @angular/cli`
- Version check: `ng version`
- Should show: Angular CLI 17.x.x or higher

☐ **6. Install SQL Server Management Studio (SSMS) - Optional but helpful**
- Download: https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms
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
- Go to: https://github.com/new
- Repository name: "campus-portfolio-system" (or your choice)
- Description: "Portfolio management system for Microsoft campus"
- Set to: Private (for now)
- ✓ Add README.md
- ✓ Add .gitignore (choose: VisualStudio)
- Click "Create repository"

☐ **2. Clone Repository Locally**
- Copy the repository URL
- Open terminal in your projects folder
- Run: `git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git`
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
- Run: `cd frontend`
- Run: `npm install -D tailwindcss postcss autoprefixer`
- Run: `npx tailwindcss init`
- Configure Tailwind (I can help with this later)

☐ **3. Test Angular App**
- Run: `ng serve`
- Open browser: http://localhost:4200
- ✓ Success = You should see Angular welcome page
- Press Ctrl+C to stop server

☐ **4. Install Additional Packages**
- Run: `npm install @angular/material @angular/cdk`
- Run: `npm install angular-oauth2-oidc`

### Phase 3: Create ASP.NET Core Backend

☐ **1. Create .NET Web API Project**
- In your repo root folder (not in frontend), run:
  ```bash
  dotnet new webapi -n Backend
  ```
- This creates a "Backend" folder with your API

☐ **2. Install Required NuGet Packages**
- Run: `cd Backend`
- Run: `dotnet add package Microsoft.EntityFrameworkCore`
- Run: `dotnet add package Microsoft.EntityFrameworkCore.SqlServer`
- Run: `dotnet add package Microsoft.EntityFrameworkCore.Tools`
- Run: `dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer`

☐ **3. Test .NET API**
- Run: `dotnet run`
- Open browser: https://localhost:7XXX/swagger (port will be shown in terminal)
- ✓ Success = You should see Swagger API documentation
- Press Ctrl+C to stop server

### Phase 4: Setup Azure Resources

> **⚠️ IMPORTANT: Resource Group Region vs Resource Region**
>
> Resource Group Region is just metadata (where Azure stores information about the group). It does **NOT** affect where your actual resources run. When creating resources like SQL Server, Storage Account, and App Service, choose the **SAME** actual region for all of them (not necessarily the same as the resource group region) to minimize latency and avoid cross-region data transfer costs.
>
> **Example:**
> - Resource Group Region: East US (just metadata)
> - SQL Server Location: East US 2 (actual compute)
> - Storage Account Location: East US 2 (actual storage)
> - App Service Location: East US 2 (actual compute)
> - ✓ All resources co-located in East US 2 = fast, low-cost data transfer

☐ **1. Create Resource Group**
- Go to Azure Portal: https://portal.azure.com
- Search for "Resource groups"
- Click "+ Create"
- Name: "campus-portfolio-rg"
- Region: (Choose closest to you, e.g., "East US" - this is just metadata)
- Click "Review + create" → "Create"

☐ **2. Create Azure SQL Database**
- In Azure Portal, search "SQL databases"
- Click "+ Create"
- Resource group: campus-portfolio-rg
- Database name: "campus-portfolio-db"
- Server: Create new server
  * Server name: campus-portfolio-server-[your-initials]
  * Admin login: sqladmin
  * Password: (Create strong password, SAVE IT!)
  * Location: Choose a specific region (e.g., East US 2) - this is the actual compute location
- Compute + storage: Click "Configure"
  * Choose: Basic (5 DTUs, 2GB) - Cheapest option for development
- Click "Review + create" → "Create"
- ⚠️ IMPORTANT: After creation, go to server firewall settings
  * Click "Add client IP" to allow your computer
  * Click "Save"

☐ **3. Get Database Connection String**
- Go to your database in Azure Portal
- Click "Connection strings" on left menu
- Copy the "ADO.NET" connection string
- Replace {your_password} with your actual SQL admin password
- Save this somewhere secure (you'll need it later)

☐ **4. Create Azure Storage Account (for images/files)**
- In Azure Portal, search "Storage accounts"
- Click "+ Create"
- Resource group: campus-portfolio-rg
- Storage account name: "campusportfolio[initials]" (must be globally unique, lowercase only)
- Region: Choose the SAME region as your SQL Server (e.g., East US 2)
- Performance: Standard
- Redundancy: Locally-redundant storage (LRS)
- Click "Review + create" → "Create"

☐ **5. Create Blob Container**
- Go to your Storage Account
- Click "Containers" on left menu
- Click "+ Container"
- Name: "project-media"
- Public access level: Blob (anonymous read access for blobs only)
- Click "Create"

### Phase 5: Connect Everything Locally

☐ **1. Add Database Connection String to Backend**
- In Backend folder, open appsettings.json
- Add your connection string:
  ```json
  "ConnectionStrings": {
    "DefaultConnection": "YOUR-CONNECTION-STRING-HERE"
  }
  ```

☐ **2. Configure Entity Framework**
- In Backend folder, create: Data/ApplicationDbContext.cs
- Configure your database models based on your ERD
- I can help with this code

☐ **3. Create Database Migration**
- Run: `dotnet ef migrations add InitialCreate`
- Run: `dotnet ef database update`
- This creates your database schema in Azure SQL

☐ **4. Configure CORS (so Angular can talk to API)**
- Edit Backend/Program.cs
- Add CORS policy to allow localhost:4200
- I can provide the exact code

### Phase 6: Setup GitHub Actions for Deployment

☐ **1. Create App Service for Backend API**
- In Azure Portal, search "App Services"
- Click "+ Create"
- Resource group: campus-portfolio-rg
- Name: "campus-portfolio-api-[your-initials]"
- Publish: Code
- Runtime stack: .NET 8 (LTS)
- Operating System: Linux
- Region: Choose the SAME region as your SQL Server and Storage Account (e.g., East US 2)
- Pricing plan: Free F1 (for development)
- Click "Review + create" → "Create"

> **⚠️ NOTE: Free F1 App Service Sleep Behavior**
>
> The Free F1 tier puts your app to sleep after 20 minutes of inactivity. The first request after idle will be slow (10-30 seconds) as Azure wakes up the app. This is normal for the free tier. For production, upgrade to Basic B1 or higher to avoid sleep.

☐ **2. Connect Backend to GitHub**
- Go to your App Service
- Click "Deployment Center" on left menu
- Source: GitHub
- Authorize GitHub access
- Organization: Your GitHub username
- Repository: Your repo name
- Branch: main
- Build provider: GitHub Actions
- Click "Save"
- ✓ This automatically creates .github/workflows/azure-backend.yml

☐ **3. Create Static Web App for Frontend**
- In Azure Portal, search "Static Web Apps"
- Click "+ Create"
- Resource group: campus-portfolio-rg
- Name: "campus-portfolio-frontend"
- Plan type: Free
- Region: Choose closest (East US 2, West US 2, etc.)
- Source: GitHub
- Authorize and select your repository
- Branch: main
- Build presets: Angular
- App location: /frontend
- Output location: dist/frontend
- Click "Review + create" → "Create"
- ✓ This automatically creates .github/workflows/azure-static-web-apps.yml

☐ **4. Test Automatic Deployment**
- Make a small change in your code
- Run: `git add .`
- Run: `git commit -m "Test deployment"`
- Run: `git push origin main`
- Go to GitHub → Your repo → Actions tab
- Watch the workflows run
- ✓ Success = Both workflows show green checkmarks

### Phase 7: Configure Authentication

> **⚠️ CRITICAL: Authentication Approach Decision**
>
> **DO NOT use Azure AD B2C unless you have verified IT access:**
> Azure AD B2C requires special permissions that students often don't have. Before investing time in B2C setup, contact your IT department and verify you can create B2C tenants. If blocked, you'll waste days troubleshooting permissions.
>
> **DO NOT use Auth0 if you want to avoid third-party services:**
> Auth0 is a great service but adds an external dependency. For campus projects that need to be handed off to IT, direct OAuth integration is simpler and more maintainable.
>
> **✓ RECOMMENDED: Direct OAuth with angular-oauth2-oidc**
> This approach uses Google Cloud Console and Microsoft Entra ID App Registrations directly. No third-party service, no special permissions needed. Works with both @etown.edu Microsoft accounts and personal Google accounts.

#### Google OAuth Setup

☐ **1. Create Google OAuth App**
- Go to: https://console.cloud.google.com
- Create new project or select existing
- Navigate to: APIs & Services → Credentials
- Click "Create Credentials" → "OAuth 2.0 Client ID"
- Application type: Web application
- Name: "Campus Portfolio System"
- Authorized JavaScript origins:
  * http://localhost:4200
- Authorized redirect URIs:
  * http://localhost:4200/index.html
- Click "Create"
- Save your Client ID (you'll need this later)

#### Microsoft OAuth Setup

☐ **2. Create Microsoft App Registration**
- Go to: https://portal.azure.com
- Search for "App registrations"
- Click "+ New registration"
- Name: "Campus Portfolio System"
- Supported account types: Accounts in any organizational directory and personal Microsoft accounts
- Redirect URI: Single-page application (SPA)
  * http://localhost:4200/index.html
- Click "Register"
- From the Overview page, copy:
  * Application (client) ID
  * Directory (tenant) ID

#### Frontend Configuration

☐ **3. Configure Angular with angular-oauth2-oidc**
- Update frontend/src/app/app.config.ts:
  * Import OAuthModule and provideOAuthClient()
  * Configure Google and Microsoft as OIDC providers
  * Set clientId, redirectUri, scope, issuer per provider
- I can provide the exact configuration code

#### Backend Configuration

☐ **4. Configure Backend JWT Validation**
- Update Backend/appsettings.json with:
  * Google:ClientId
  * Microsoft:ClientId, Microsoft:TenantId
- Update Backend/Program.cs:
  * AddAuthentication() with multiple JWT Bearer schemes
  * One scheme for Google tokens, one for Microsoft tokens
  * Policy-based scheme selector that inspects token issuer claim
- I can provide the exact code for both files

☐ **5. Protect API Routes**
- Add [Authorize] attribute to controllers that require login
- Use [AllowAnonymous] for public endpoints

#### Production OAuth Setup

☐ **6. Update OAuth Redirect URIs for Production**
- After Static Web App is created, add its URL to both OAuth providers:
- Google Cloud Console → your OAuth app → Authorized redirect URIs:
  * Add: https://YOUR-APP.azurestaticapps.net/index.html
- Azure App Registration → Authentication:
  * Add: https://YOUR-APP.azurestaticapps.net/index.html

---

## VERIFICATION CHECKLIST

### Backend Working:

☐ Can run locally: dotnet run  
☐ Can access Swagger UI  
☐ Database connection works  
☐ Can create/read from database  
☐ Deployed to Azure App Service  
☐ API is accessible via Azure URL  

### Frontend Working:

☐ Can run locally: ng serve  
☐ Can see Angular app in browser  
☐ Tailwind CSS styling works  
☐ Deployed to Azure Static Web Apps  
☐ Frontend is accessible via Azure URL  

### Integration Working:

☐ Frontend can call backend API  
☐ Authentication works (can login with Google)  
☐ Authentication works (can login with Microsoft)  
☐ Can create/read/update/delete data  
☐ File uploads work (to Azure Blob Storage)  

### DevOps Working:

☐ Code is in GitHub repository  
☐ Push to main triggers automatic deployment  
☐ Both frontend and backend deploy successfully  
☐ Can see deployment logs in GitHub Actions  

---

## NEXT STEPS AFTER SETUP

Once you complete the setup and verification checklist, you're ready to start building features:

- Create database models based on your ERD
- Create API controllers (Users, Projects, Events, etc.)
- Create Angular components (forms, lists, detail pages)
- Implement authentication flow
- Add file upload functionality
- Style with Tailwind CSS
- Test everything
- Deploy to production

---

## TROUBLESHOOTING COMMON ISSUES

### Issue: "Cannot connect to Azure SQL Database"

**Solution:**
- Check firewall rules in Azure Portal
- Add your IP address to allowed IPs
- Verify connection string is correct
- Check if password contains special characters that need escaping

### Issue: "GitHub Actions deployment fails"

**Solution:**
- Check workflow logs in GitHub Actions tab
- Verify Azure credentials are correct
- Check build logs for errors
- Make sure workflow file paths match your project structure

### Issue: "CORS errors in browser console"

**Solution:**
- Update CORS policy in Backend/Program.cs
- Make sure Angular app URL is allowed
- Restart backend after changes
- Verify both localhost:4200 AND your Azure Static Web App URL are in the CORS policy

### Issue: "Authentication not working"

**Solution:**
- Verify redirect URIs in Google Cloud Console / Azure App Registration match EXACTLY
- Check browser console for OIDC errors
- Ensure Client IDs are correct in app config
- Clear browser cache and cookies
- For Microsoft: verify tenant ID and supported account types are correct
- For Microsoft: make sure redirect URI is registered as 'Single-page application (SPA)' type, not 'Web'
- Check that backend JWT validation schemes match the token issuer claims

### Issue: "Azure AD B2C setup failing"

**Solution:**
- DO NOT use Azure AD B2C unless you verified IT permissions first
- Students often don't have permissions to create B2C tenants
- If you're blocked by permissions, switch to direct OAuth approach (Phase 7 above)
- Contact IT department to request B2C access OR use the direct OAuth approach instead

### Issue: "Azure for Students not available"

**Solution:**
- Use regular Azure free tier (still get $200 credit for 30 days)
- Or use Azure SQL free tier database
- Contact your school IT department for education access

### Issue: "App Service taking 30+ seconds to load"

**Solution:**
- This is NORMAL for Free F1 tier after 20 minutes of inactivity
- Azure puts the app to sleep to save resources
- First request wakes up the app (slow), subsequent requests are fast
- For production, upgrade to Basic B1 or higher to avoid sleep

---

## COST MANAGEMENT

### With Azure for Students ($100 credit):

- OAuth (Google + Microsoft): **Free** — no third-party service
- Azure SQL Database (Basic): **~$5/month**
- App Service (Free F1): **$0/month**
- Static Web Apps (Free): **$0/month**
- Storage Account: **~$0.50/month**
- **Total: ~$5.50/month** (well within student credit)

### Tips to stay within free tier:

- Use Free F1 App Service tier for development
- Use Basic SQL Database (smallest size)
- Delete resources when not actively developing
- Set up cost alerts in Azure Portal
- Co-locate all resources in the same region to avoid data transfer costs

---

## HELPFUL RESOURCES

### Documentation:

- Angular: https://angular.io/docs
- ASP.NET Core: https://docs.microsoft.com/en-us/aspnet/core/
- Entity Framework: https://docs.microsoft.com/en-us/ef/core/
- Azure: https://docs.microsoft.com/en-us/azure/
- angular-oauth2-oidc: https://github.com/manfredsteyer/angular-oauth2-oidc
- Google OAuth setup: https://console.cloud.google.com
- Microsoft App Registration: https://portal.azure.com
- ASP.NET Core OAuth docs: https://docs.microsoft.com/en-us/aspnet/core/security/authentication/social/

### YouTube Tutorials:

- "ASP.NET Core Web API Tutorial" by freeCodeCamp
- "Angular Tutorial for Beginners" by Programming with Mosh
- "Azure Fundamentals" by Microsoft Learn

### Support:

- Stack Overflow: https://stackoverflow.com
- GitHub Issues (for specific packages)
- Your school IT department (for campus integration)
