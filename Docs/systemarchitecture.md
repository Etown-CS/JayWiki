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
            AppService["Azure App Service (B1 Tier)<br/>ASP.NET Core Web API<br/>(.NET 8 + Entity Framework Core)"]
        end
        
        subgraph Data["Data Tier"]
            SQL["Azure SQL Database<br/>(Basic Tier, 5 DTUs)<br/>Relational Data Storage"]
            Blob["Azure Blob Storage<br/>Multimedia Content<br/>(Images, Videos)"]
        end
    end
    
    subgraph Auth["Authentication Providers"]
        Google["Google OAuth 2.0"]
        Microsoft["Microsoft Entra ID<br/>(Campus SSO)"]
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
    Actions -.->|"Deploy Backend<br/>+ EF Migrations"| AppService
    
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
- **Azure App Service (B1):** Hosts ASP.NET Core Web API with dedicated compute resources

**Data Tier (Blue):**
- **Azure SQL Database:** Stores structured data (users, projects, courses, events)
- **Azure Blob Storage:** Stores multimedia content (images, videos)

**Authentication Providers (Red):**
- **Google OAuth 2.0:** External user authentication
- **Microsoft Entra ID:** Campus SSO for @etown.edu accounts

**CI/CD Pipeline (Orange):**
- **GitHub:** Version control and source repository
- **GitHub Actions:** Automated build, test, and deployment workflows

## Key Communication Paths

- **Solid arrows (→):** Primary data flow
- **Dashed arrows (-.->):** Authentication/deployment flows
- **HTTPS:** All client-facing communications encrypted
- **JWT:** API requests authenticated with JSON Web Tokens
- **REST API:** RESTful endpoints following standard HTTP methods

## Architecture Highlights

1. **Three-Tier Separation:** Clear separation of concerns between presentation, application, and data layers
2. **Cloud-Native:** Fully managed Azure services with automatic scaling and high availability
3. **Hybrid Authentication:** Supports both campus SSO and external OAuth providers
4. **Automated Deployment:** CI/CD pipeline ensures consistent deployments
5. **Cross-Region Configuration:** App Service (East US) and SQL Database (West US 2) - noted as area for future optimization