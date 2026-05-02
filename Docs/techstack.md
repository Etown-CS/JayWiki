# JayWiki Tech Stack Summary

**Project:** Campus Portfolio Management System
**Last Updated:** May 2026

---

## Frontend

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Angular 21+** | Web framework for building the user interface | All pages, forms, navigation, user interactions | Microsoft's preferred frontend framework, great for enterprise apps with complex forms |
| **TypeScript** | Typed JavaScript | All frontend code | Type safety, better developer experience, catches errors early |
| **Tailwind CSS v3.4.1** | Utility-first CSS framework | Styling and responsive design | Fast development, consistent design, easy to maintain. Pinned to v3.4.1 for stability — v4 has compatibility issues with this project's build configuration |

---

## Backend

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **ASP.NET Core Web API (C#, .NET 10)** | Microsoft's backend framework | REST API, business logic, data processing | Native Microsoft solution, excellent Azure integration, enterprise-grade |
| **Entity Framework Core 10.0.5** | Object-Relational Mapper (ORM) | Database operations, converting C# objects to SQL | Simplifies database code, type-safe queries, handles migrations |
| **BCrypt.Net-Next** | Password hashing library | Hashing and verifying local account passwords | Industry-standard BCrypt algorithm; passwords never stored in plain text |

---

## Database

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Azure SQL Database** | Cloud-hosted SQL Server database | Storing users, identities, projects, courses, events, socials, and media metadata | Native Microsoft cloud database, scales well, secure, integrates with campus |

---

## Authentication

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **angular-oauth2-oidc** | Lightweight OAuth 2.0 / OIDC library | Frontend OAuth flow for Google + Microsoft | No third-party service; direct OAuth with providers; well-maintained, works natively with Angular |
| **ASP.NET Core JWT Bearer** | Built-in JWT authentication middleware | Backend token validation for all three providers (Google, Microsoft, Local) | Native .NET authentication, multi-scheme support via policy-based selector |
| **Google Cloud Console** | OAuth app registration | Google OAuth 2.0 client credentials | Direct OAuth with personal Google accounts |
| **Microsoft Entra ID** | OAuth app registration (common endpoint) | Microsoft OAuth 2.0 client credentials | Supports @etown.edu organizational accounts + personal Microsoft accounts. Registered under personal `etownjaywiki@outlook.com` account — school tenant registration blocked by IT |
| **Local JWT (backend-issued)** | HMAC-SHA256 signed JWT | Email + password authentication | No external provider needed; backend issues and validates its own tokens; signing key stored in `.env` as `JWT_SIGNING_KEY` |

### Authentication Flow

**OAuth (Google / Microsoft):**
1. Frontend uses `angular-oauth2-oidc` to initiate PKCE code flow with selected provider
2. User authenticates and grants consent
3. Frontend receives ID token (Google) or access token (Microsoft)
4. After OAuth completes, frontend calls `POST /api/users/me` with the token
5. Backend inspects `iss` claim, routes to correct JWT scheme, validates token
6. Backend looks up `UserIdentity` by (Provider, ProviderEmail) — creates or links as needed
7. Frontend navigates to dashboard

**Local (Email + Password):**
1. User submits email + password to `POST /api/auth/register` or `POST /api/auth/login`
2. Backend hashes/verifies password with BCrypt
3. Backend issues signed JWT (issuer: `jaywiki-api`, 7-day expiry)
4. Frontend stores token in `localStorage` as `local_token`

**All providers:** Token attached to every API request via Angular HTTP interceptor. Backend uses a `MultiScheme` policy selector to route to the correct validation scheme based on the `iss` claim.

---

## File Storage

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Azure Blob Storage** | Cloud object storage for files | Profile images, project media, event media | Scalable, secure, integrates with Azure, CDN support |

**Implementation Notes:**
- Profile images uploaded via `POST /api/users/me/profile-image` (5MB max, JPEG/PNG/GIF/WEBP)
- Old blob deleted after new URL is safely persisted (best-effort cleanup)
- Media URLs stored in `PROJECT_MEDIA` and `EVENT_MEDIA` database tables
- Three storage containers: `profile-images`, `project-media`, `event-media` — all with public blob access
- Unique blob naming to prevent collisions

---

## Cloud Hosting

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Azure App Service** | Managed hosting for web apps | Hosting the ASP.NET Core backend API | B1 (Basic) tier provides dedicated compute with no sleep/cold start issues |
| **Azure Static Web Apps** | Hosting for static frontend apps | Hosting the Angular frontend | Fast, global CDN, free SSL, integrates with backend API |

### Hosting Architecture
```
[User Browser]
     ↓
[Azure Static Web Apps] ← Angular frontend (HTML/CSS/JS)
     ↓ API calls (HTTPS + JWT)
[Azure App Service] ← ASP.NET Core Web API (.NET 10)
     ↓ Database queries (EF Core)
[Azure SQL Database] ← Relational data storage
     ↓ Media storage
[Azure Blob Storage] ← Profile images and media files
```

### Current Azure Deployment

**Resource Group:** `jaywiki-rg`

**Resources:**
- **SQL Server:** `jaywiki-server-ms` (West US 2)
- **SQL Database:** `jaywiki-db` — Basic tier, 5 DTUs (West US 2)
- **App Service:** `jaywiki-api-ms` — Linux, B1 tier (East US)
- **Static Web App:** `jaywiki-frontend` (East US 2)
- **Storage Account:** `jaywikims` — Azure Blob Storage (profile images, project media, event media)
- **Subscription:** Azure for Students

**⚠️ Performance Note:** App Service (East US) and SQL Database (West US 2) are in different regions, adding ~60-80ms cross-region latency per database query. Acceptable for development — should be co-located in production.

---

## Development Tools

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **VS Code** | Code editor | Writing code, debugging | Best support for .NET and Angular development |
| **Git + GitHub** | Version control and collaboration platform | Source control, code collaboration | Required for project, branch-per-feature workflow with PRs |
| **GitHub Actions** | Automated CI/CD workflow system | Building and deploying code to Azure automatically | Free, integrated with GitHub, auto-deploys on every push to main |
| **Postman** | API testing tool | Testing backend endpoints | Primary API testing tool — Swashbuckle v10 ships with a Microsoft.OpenApi v2.0 breaking change that causes Swagger UI failures; Postman is the reliable fallback |
| **GitHub Desktop** | Git GUI client | Branch management, commits, PRs | Simplifies Git workflow without CLI |

---

## Optional Enhancements

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Power BI** | Business intelligence and analytics | Dashboard showing student projects, event stats | Native Microsoft tool, easy to embed, great visualizations |
| **Microsoft Graph API** | API to access Microsoft 365 data | Pull Outlook, Teams data (optional future enhancement) | Seamless integration with Microsoft services |

---

## Tech Stack at a Glance

```
Frontend:     Angular 21+ + TypeScript + Tailwind CSS v3.4.1
Backend:      ASP.NET Core Web API (.NET 10) + Entity Framework Core 10.0.5
Database:     Azure SQL Database (Basic 5 DTUs)
Auth:         angular-oauth2-oidc + ASP.NET Core JWT Bearer
              (Google OAuth, Microsoft Entra ID common endpoint, Local email/password)
Storage:      Azure Blob Storage
Hosting:      Azure App Service (B1) + Azure Static Web Apps
DevOps:       Git + GitHub + GitHub Actions
```

**Estimated Monthly Cost:** ~$18.50/month (within $100 Azure student credit)
- Azure App Service B1: ~$13/month
- Azure SQL Database Basic (5 DTUs): ~$5/month
- Azure Blob Storage: ~$0.50/month
- **Total for 5 months:** ~$92.50 (leaves $7.50 buffer in student credit)

---

## Why This Stack?

### ✅ Campus Integration
- **Microsoft Entra ID (common endpoint):** Supports @etown.edu organizational accounts + personal Microsoft accounts without requiring school tenant admin access
- **Google OAuth:** External users can log in with personal Google accounts
- **Local auth:** Email + password option for users without Google or Microsoft accounts
- **No third-party auth service:** Direct OAuth eliminates Auth0/B2C dependencies

### ✅ Microsoft Ecosystem Alignment
- All Microsoft technologies = easier IT approval and handoff
- Familiar tools for campus IT staff
- Native Azure integration across all services

### ✅ Enterprise-Grade Features
- Type safety with TypeScript (frontend) and C# (backend)
- Triple-provider authentication with multi-scheme JWT validation
- Scalable cloud infrastructure
- BCrypt password hashing for local accounts

### ✅ Developer Experience
- Valuable job market skills (.NET + Azure)
- Strong typing catches errors during development
- Entity Framework simplifies database operations
- All endpoints documented and testable via Postman

### ✅ Production Ready
- Can be deployed to campus infrastructure post-graduation
- Professional architecture suitable for real-world use
- Security best practices built in (PKCE, BCrypt, provider-scoped identity lookup)
- Comprehensive documentation for future maintainers

### ✅ Cost Effective
- Total cost ~$18.50/month — well within $100 Azure student credit
- B1 tier provides production-grade performance for academic workloads
- No vendor lock-in for authentication

---

## Key Technical Decisions

### Why Angular over React?
- Microsoft's preferred framework for enterprise applications
- Better alignment with campus IT expectations
- Excellent form handling for complex data entry

### Why Direct OAuth over Auth0/Azure AD B2C?
- **Auth0:** Third-party dependency, additional cost, overkill for multi-provider auth
- **Azure AD B2C:** Blocked by school IT permissions, requires tenant admin access
- **Direct OAuth:** No dependencies, no IT blockers, well-supported by libraries

### Why add local email/password?
- Covers users without Google or Microsoft accounts
- No external dependency — backend issues and validates its own JWTs
- Integrates cleanly with the existing multi-scheme JWT selector

### Why ASP.NET Core over Node.js?
- Native Microsoft stack = easier campus IT handoff
- Entity Framework provides robust ORM
- Excellent Azure integration
- Strong typing with C# matches TypeScript on frontend

### Why Azure SQL over PostgreSQL/MongoDB?
- Native Microsoft cloud database
- Entity Framework Core has best support for SQL Server
- Familiar to campus IT staff

### Why B1 App Service over Free F1?
- **No cold starts:** Free F1 sleeps after 20 minutes of inactivity (10-30 second wake-up time)
- **Consistent performance:** B1 provides dedicated compute resources
- **Cost justified:** ~$13/month is acceptable for a production-grade capstone project

### Why Tailwind CSS v3.4.1 specifically?
- Pinned to v3.4.1 for build stability — v4 introduced breaking changes with this project's PostCSS configuration
- v3.4.1 is fully supported and covers all styling needs

---

## Infrastructure Considerations

### Region Selection
**Current Setup:**
- SQL Database: West US 2
- App Service: East US
- Static Web App: East US 2

**Impact:** App Service and SQL Database in different regions adds ~60-80ms cross-region latency per database query. Not critical for development workloads.

**Future Optimization:** Co-locate all resources in a single region (East US 2 or West US 2) to reduce latency to ~1-5ms and eliminate cross-region transfer costs.

### Scalability Strategy
**Current (Development):**
- B1 App Service: 1 instance, 1.75 GB RAM, 1 vCPU
- SQL Basic: 5 DTUs (sufficient for ~5-10 concurrent users)

**Production Scaling Options:**
- App Service: Scale to B2/B3 or S1 for more CPU/RAM
- SQL Database: Scale to Standard tier (S0-S3) for higher DTU allocation
- CDN: Add Azure CDN for static content delivery

---

## Project Timeline

**Deadline:** May 2026 (academic submission)
**Handoff:** Post-graduation to Elizabethtown College School of Engineering and Computer Science
**Implementation:** 8-week milestone plan
**Current Status:** ✅ Complete — submitted, deployed, and handed off to ECS department