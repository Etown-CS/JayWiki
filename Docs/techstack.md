# JayWiki Tech Stack Summary

**Project:** Campus Portfolio Management System
**Last Updated:** March 25, 2026  

---

## Frontend

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Angular** | Web framework for building the user interface | All pages, forms, navigation, user interactions | Microsoft's preferred frontend framework, great for enterprise apps with complex forms |
| **TypeScript** | Typed JavaScript | All frontend and backend code | Type safety, better developer experience, catches errors early |
| **Tailwind CSS** | Utility-first CSS framework | Styling and responsive design | Fast development, consistent design, easy to maintain |

---

## Backend

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **ASP.NET Core Web API (C#)** | Microsoft's backend framework | REST API, business logic, data processing | Native Microsoft solution, excellent Azure integration, enterprise-grade |
| **Entity Framework Core** | Object-Relational Mapper (ORM) | Database operations, converting C# objects to SQL | Simplifies database code, type-safe queries, handles migrations |

---

## Database

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Azure SQL Database** | Cloud-hosted SQL Server database | Storing users, projects, events, jobs, socials, etc. | Native Microsoft cloud database, scales well, secure, integrates with campus |

---

## Authentication

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **angular-oauth2-oidc** | Lightweight OAuth 2.0 / OIDC library | Frontend OAuth flow for Google + Microsoft | No third-party service; direct OAuth with providers; well-maintained, works natively with Angular |
| **ASP.NET Core JWT Bearer** | Built-in JWT authentication middleware | Backend token validation for Google + Microsoft | Native .NET authentication, dual-scheme support for multiple OAuth providers |
| **Google Cloud Console** | OAuth app registration | Google OAuth 2.0 client credentials | Direct OAuth with Google accounts |
| **Microsoft Entra ID** | OAuth app registration (formerly Azure AD) | Microsoft OAuth 2.0 client credentials | Direct OAuth with @etown.edu campus accounts + personal Microsoft accounts |

### Authentication Flow
1. Frontend uses `angular-oauth2-oidc` to initiate OAuth with Google or Microsoft
2. User authenticates with chosen provider and grants consent
3. Frontend receives ID token (Google) or access token (Microsoft)
4. Frontend sends token to backend with each API request
5. Backend validates token and extracts user claims (email, name)
6. Backend creates user record on first login via `POST /api/users/me`

---

## File Storage

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Azure Blob Storage** | Cloud object storage for files | Project images, videos, resumes, event photos | Scalable, secure, integrates with Azure, CDN support |

**Implementation Notes:**
- Planned container: `jaywiki-media` with public read access
- Media URLs stored in `PROJECT_MEDIA` and `EVENT_MEDIA` database tables
- Unique blob naming to prevent collisions
- Future CDN integration for global delivery

---

## Cloud Hosting

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Azure App Service** | Managed hosting for web apps | Hosting the ASP.NET Core backend API | Free F1 tier sufficient for capstone; **Note:** app sleeps after 20 min inactivity — first load after idle is slow (~10-15 sec cold start) |
| **Azure Static Web Apps** | Hosting for static frontend apps | Hosting the Angular frontend | Fast, global CDN, free SSL, integrates with backend API |

### Hosting Architecture
```
[User Browser]
     ↓
[Azure Static Web Apps] ← Angular frontend (HTML/CSS/JS)
     ↓ API calls
[Azure App Service] ← ASP.NET Core Web API
     ↓ Database queries
[Azure SQL Database] ← Data storage
     ↓ Media storage
[Azure Blob Storage] ← Files and images
```

---

## Development Tools

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **VS Code** | Code editor | Writing code, debugging | Best support for .NET and Angular development |
| **Git + GitHub** | Version control and collaboration platform | Source control, code collaboration, project requirement | Required for project, track changes, team collaboration |
| **GitHub Actions** | Automated CI/CD workflow system built into GitHub | Building and deploying code to Azure automatically | Free, integrated with GitHub, auto-deploys on every push to main |
| **Postman / Swagger** | API testing tools | Testing backend endpoints | Swagger auto-generated from ASP.NET, Postman for manual testing |
| **Azure Application Insights** | Monitoring and analytics | Track app performance, errors, usage | Built into Azure, helps maintain app health |

---

## Optional Enhancements

| Technology | What | Used For | Why |
|------------|------|----------|-----|
| **Power BI** | Business intelligence and analytics | Dashboard showing student projects, event stats | Native Microsoft tool, easy to embed, great visualizations |
| **Microsoft Graph API** | API to access Microsoft 365 data | Pull LinkedIn, Outlook, Teams data (optional future enhancement) | Seamless integration with Microsoft services |

---

## Tech Stack at a Glance

```
Frontend:     Angular + TypeScript + Tailwind CSS
Backend:      ASP.NET Core Web API + Entity Framework Core
Database:     Azure SQL Database
Auth:         angular-oauth2-oidc + ASP.NET Core OAuth (Google + Microsoft)
Storage:      Azure Blob Storage
Hosting:      Azure App Service + Static Web Apps
DevOps:       Git + GitHub + GitHub Actions
```

**Estimated Monthly Cost:** ~$5.50/month (within $100 Azure student credit)

---

## Why This Stack?

### ✅ Campus Integration
- **Microsoft SSO:** Native support for @etown.edu Microsoft accounts via Entra ID
- **Google OAuth:** External users can log in with personal Google accounts
- **No third-party auth service:** Direct OAuth eliminates Auth0/B2C dependencies

### ✅ Microsoft Ecosystem Alignment
- All Microsoft technologies = easier IT approval and handoff
- Familiar tools for campus IT staff
- Native Azure integration across all services

### ✅ Enterprise-Grade Features
- Type safety with TypeScript (frontend + backend via C#)
- Robust authentication and authorization
- Scalable cloud infrastructure
- Built-in monitoring and analytics

### ✅ Developer Experience
- **You already know Angular** from AICA project
- Valuable job market skills (.NET + Azure)
- Strong typing catches errors during development
- Entity Framework simplifies database operations

### ✅ Production Ready
- Can be deployed to campus infrastructure post-graduation
- Professional architecture suitable for real-world use
- Security best practices built in
- Comprehensive documentation for future maintainers

### ✅ Cost Effective
- Total cost ~$5.50/month — well within $100 Azure student credit
- Free tiers available for most services during development
- No vendor lock-in for authentication

---

## Key Technical Decisions

### Why Angular over React?
- Microsoft's preferred framework for enterprise applications
- Better alignment with campus IT expectations
- Familiar from prior AICA project experience
- Excellent form handling for complex data entry

### Why Direct OAuth over Auth0/Azure AD B2C?
- **Auth0:** Third-party dependency, additional cost, overkill for dual-provider auth
- **Azure AD B2C:** Blocked by school IT permissions, requires tenant admin access
- **Direct OAuth:** No dependencies, no IT blockers, well-supported by libraries

### Why ASP.NET Core over Node.js?
- Native Microsoft stack = easier campus IT handoff
- Entity Framework provides robust ORM
- Excellent Azure integration
- Strong typing with C# matches TypeScript on frontend

### Why Azure SQL over PostgreSQL/MongoDB?
- Native Microsoft cloud database
- Better integration with campus Microsoft environment
- Entity Framework Core has best support for SQL Server
- Familiar to campus IT staff

---

## Project Timeline

**Deadline:** Mid-April 2025 (academic submission)  
**Handoff:** Post-graduation to E-town School of Engineering  
**Implementation:** 8-week milestone plan