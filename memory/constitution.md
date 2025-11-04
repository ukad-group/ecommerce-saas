# eCommerce SaaS MVP Constitution

## Core Principles

### I. API-First Development
Define API contracts before implementation. Build UI against mock backend, validate UX, then implement production backend.

### II. Mock-First UI Development
UI validated against .NET Mock API before production backend implementation. Mock API (mock-api/) serves as contract reference.

### III. Multi-Platform Integration Ready
Clean API boundaries. RESTful with OpenAPI. Supports CMS plugins (Umbraco, Optimizely).

### IV. YAGNI (MVP Focus)
Build only requested features. Core eCommerce only: catalog, cart, orders, basic accounts.

### V. SaaS-First Architecture
Multi-tenant from day one:
- **Tenant**: Business entity (retail chain)
- **Market**: Store/location within tenant (each has own catalog)
- Isolation at data and API level

### VI. Test-Driven Development (NON-NEGOTIABLE)
TDD workflow: Spec → API contracts → Mock backend → UI tests → UI implementation → Production backend

### VII. Simplicity and Clarity
Simple patterns, self-documenting code, minimal dependencies.

## Technical Stack

**Current (MVP):**
- Admin: React 18 + TypeScript + Vite + TanStack Query + Zustand
- Mock API: ASP.NET Core 9.0 Web API (ports: 5180)
- Showcase: ASP.NET Core 9.0 MVC (port: 5025)

**Production Backend (Future):**
- .NET 8+ with PostgreSQL, OAuth2/OIDC, Redis, message queue

## Development Workflow

1. **Spec** → `specs/[number]-[feature]/spec.md`
2. **Plan** → API contracts (OpenAPI), mock implementation, tasks
3. **Implement** → UI with mock API → Production backend
4. **Quality** → 80% test coverage, code review, CI/CD

## Repository Structure

```
/specs/          # Feature specifications (001, 002, 003, 004)
/memory/         # This constitution
/frontend/       # React admin backoffice (port 5173)
/mock-api/       # .NET Mock API server (port 5180)
/showcase-dotnet/  # Demo storefront (port 5025)
```

## Data Hierarchy

```
Tenant → Markets → Categories → Products → Variants
Orders belong to Market
Users assigned to Tenant (with market permissions)
```

**Version**: 2.0.0 | **Last Updated**: 2025-11-04
