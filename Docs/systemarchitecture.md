# System Architecture Diagram

This diagram shows the three-tier cloud deployment on Azure infrastructure for the JayWiki Campus Portfolio Management System.

```mermaid
flowchart TB
    subgraph User["User Layer"]
        Browser["Web Browser<br/>(Desktop/Mobile)"]
    end
    
    subgraph GitHub["CI/CD Pipeline"]
        GH["GitHub Repository<br/>(Git Version Control)"]
        Actions["GitHub Actions<br/>(Automated Deployment)"]
    end
    
    subgraph Azure["Microsoft Azure Cloud Infrastructure"]
        subgraph Presentation["Presentation Tier"]
            SWA["Azure Static Web Apps<br/>Angular SPA<br/>(TypeScript + Tailwind CSS)"]
        end
        
        subgraph Application["Application Tier"]
            AppService["Azure App Service<br/>ASP.NET Core Web API<br/>(.NET 10 + Entity Framework Core 10)<br/>Local auth issued here (email/password JWT)"]
        end
        
        subgraph Data["Data Tier"]
            SQL["Azure SQL Database<br/>Relational Data Storage<br/>(Users, Projects, Courses, Events)"]
            Blob["Azure Blob Storage<br/>Multimedia Content<br/>(Profile Images, Project & Event Media)"]
        end
    end
    
    subgraph Auth["External Authentication Providers"]
        Google["Google OAuth 2.0<br/>(Personal Google accounts)"]
        Microsoft["Microsoft Entra ID<br/>(common endpoint)<br/>(@etown.edu + personal Microsoft accounts)"]
    end
    
    %% User interactions
    Browser -->|"HTTPS"| SWA
    Browser -.->|"OAuth Login"| Google
    Browser -.->|"OAuth Login"| Microsoft
    
    %% Frontend to Backend
    SWA -->|"REST API<br/>(HTTPS + JWT)"| AppService
    
    %% Backend to Data
    AppService -->|"SQL Queries<br/>(Entity Framework)"| SQL
    AppService -->|"Media Upload/Retrieval"| Blob
    
    %% Authentication validation
    AppService -.->|"Token Validation"| Google
    AppService -.->|"Token Validation"| Microsoft
    
    %% CI/CD Flow
    GH --> Actions
    Actions -.->|"Deploy Frontend"| SWA
    Actions -.->|"Deploy Backend"| AppService
    
    %% Styling
    classDef azureService fill:#0078D4,stroke:#004578,stroke-width:2px,color:#fff
    classDef userLayer fill:#50C878,stroke:#2E8B57,stroke-width:2px,color:#fff
    classDef authLayer fill:#FF6B6B,stroke:#C92A2A,stroke-width:2px,color:#fff
    classDef cicdLayer fill:#FFA500,stroke:#CC8400,stroke-width:2px,color:#fff
    
    class SWA,AppService,SQL,Blob azureService
    class Browser userLayer
    class Google,Microsoft authLayer
    class GH,Actions cicdLayer
```

## Diagram Legend

**User Layer (Green):**
- Web browsers (desktop and mobile) accessing the system

**Presentation Tier (Blue):**
- **Azure Static Web Apps:** Hosts Angular single-page application with global CDN distribution

**Application Tier (Blue):**
- **Azure App Service:** Hosts ASP.NET Core Web API
- Also acts as local auth issuer — generates and validates its own signed JWTs for email/password accounts (no external provider involved)

**Data Tier (Blue):**
- **Azure SQL Database:** Stores structured data (users, identities, projects, courses, events)
- **Azure Blob Storage:** Stores profile images, project media, and event media across three public-access containers (`profile-images`, `project-media`, `event-media`)

**External Authentication Providers (Red):**
- **Google OAuth 2.0:** Personal Google accounts; frontend sends ID token to backend
- **Microsoft Entra ID (common endpoint):** Supports both @etown.edu organizational accounts and personal Microsoft accounts; registered under a personal `etownjaywiki@outlook.com` app registration (school tenant registration blocked by IT); frontend sends access token to backend

**CI/CD Pipeline (Orange):**
- **GitHub:** Version control and source repository
- **GitHub Actions:** Automated build and deployment workflows — two pipelines run on every push to `main`, one for the frontend and one for the backend. EF Core migrations are applied manually via `dotnet ef database update`, not automatically by CI/CD.

## Authentication Providers Summary

| Provider | Type | Token Sent | Handled By |
|----------|------|------------|------------|
| Google OAuth 2.0 | External | ID token | Backend Google JWT scheme |
| Microsoft Entra ID | External (common endpoint) | Access token | Backend Microsoft JWT scheme |
| Local (email/password) | Internal | Backend-issued JWT | Backend Local JWT scheme |

## Key Communication Paths

- **Solid arrows (→):** Primary data flow
- **Dashed arrows (-.->):** Authentication/deployment flows
- **HTTPS:** All client-facing communications encrypted
- **JWT:** API requests authenticated with JSON Web Tokens (Google ID token, Microsoft access token, or locally-issued JWT)
- **REST API:** RESTful endpoints following standard HTTP methods

## Architecture Highlights

1. **Three-Tier Separation:** Clear separation of concerns between presentation, application, and data layers
2. **Cloud-Native:** Fully managed Azure services with automatic scaling and high availability
3. **Triple Authentication:** Google OAuth, Microsoft Entra ID (common endpoint), and local email/password — all validated via a policy-based multi-scheme JWT selector
4. **Automated Deployment:** CI/CD pipeline ensures consistent deployments via GitHub Actions on every push to `main`
5. **Cross-Region Configuration:** The current deployment has App Service in East US and SQL Database in West US 2, adding ~60–80ms cross-region latency per query. All resources should be co-located in a single region before scaling to production to reduce this to ~1–5ms.