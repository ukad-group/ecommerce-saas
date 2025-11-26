<div align="center">

# eCommerce Backoffice

### Headless eCommerce Platform with Multi-Tenant Architecture

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![.NET](https://img.shields.io/badge/.NET-9.0-purple.svg)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

**A complete back-office solution for eCommerce** with market-based multi-tenancy,<br/>
designed for easy integration with Umbraco, Optimizely, and other CMS platforms.

[Getting Started](#quick-start) | [Features](#features) | [Documentation](#documentation) | [License](#license)

</div>

---

**Use this project as a foundation** for your own eCommerce solution - clone it, customize it, and build upon it.

---

## What's Included

- **Admin Backoffice** - React + TypeScript admin panel for managing products, orders, and tenants
- **API Backend** - ASP.NET Core Web API with SQLite (easily upgradable to SQLServer)
- **Showcase Storefront** - ASP.NET MVC demo website showing API integration
- **Multi-Tenant Architecture** - Complete tenant and market isolation out of the box

## Quick Start

### Prerequisites
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)

### 1. Start the API Backend
```bash
cd api/EComm.Api
dotnet run
# Running on http://localhost:5180
# Swagger docs at http://localhost:5180/swagger
```

### 2. Start the Admin Panel
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### 3. Login
Open http://localhost:5173 and login with one of these test accounts:

| Email | Role | Access |
|-------|------|--------|
| `admin@platform.com` | Superadmin | All tenants |
| `admin@demostore.com` | Tenant Admin | Demo Store only |
| `catalog@demostore.com` | Catalog Manager | Demo Store, limited |

**Password for all accounts**: `password123`

### 4. (Optional) Start the Showcase Storefront
```bash
cd showcase-dotnet/ECommShowcase.Web
dotnet run
# Running on http://localhost:5025
```

---

## Features

### Product Management
- Full CRUD with **version history** - every edit creates a trackable version
- One-click version restore
- Hierarchical categories
- Multiple image upload with drag-and-drop reordering
- Quick stock updates
- Market-scoped catalogs

### Order Management
- Admin dashboard with filters and metrics
- Custom order statuses (per tenant)
- Order status workflow with notes
- Shopping cart with stock validation

### Multi-Tenancy
- **Tenant** = Business entity (e.g., retail chain)
- **Market** = Individual store/location
- Each market has its own product catalog, orders, and API keys
- Complete data isolation between tenants

### Authentication & Authorization
- JWT authentication with httpOnly cookies
- API Key authentication for integrations
- Role-based access control (Superadmin, Tenant Admin, Tenant User)

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Admin Panel    │     │    Showcase     │
│  (React SPA)    │     │  (ASP.NET MVC)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    HTTP/REST          │
         └───────────┬───────────┘
                     │
              ┌──────┴──────┐
              │ API Backend │
              │ (ASP.NET)   │
              └──────┬──────┘
                     │
              ┌──────┴──────┐
              │   SQLite    │
              │  Database   │
              └─────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Admin Panel | React 18, TypeScript 5, Vite, TanStack Query, Zustand, Tailwind CSS |
| API Backend | ASP.NET Core 9.0, C# 12, Entity Framework Core, SQLite |
| Showcase | ASP.NET Core 9.0 MVC, Bootstrap 5 |

---

## Project Structure

```
/api/                # .NET API Backend
  /EComm.Api/
    /Controllers/    # API endpoints
    /Models/         # Data models
    /Data/           # EF Core context and seeding

/frontend/           # React Admin Panel
  /src/
    /components/     # UI components
    /pages/          # Route pages
    /services/       # API clients
    /store/          # Zustand state

/showcase-dotnet/    # Demo Storefront
  /ECommShowcase.Web/

/docs/               # Documentation
  STATUS.md          # What's implemented
  ARCHITECTURE.md    # Technical details
  DEVELOPMENT.md     # Dev workflow
```

---

## Using This Project

### Clone and Customize
```bash
git clone https://github.com/ukad-group/ecommerce-saas.git my-ecommerce
cd my-ecommerce
```

### Reset the Database
Delete `api/EComm.Api/ecomm.db` and restart the API to get fresh seed data.

### Customize Seed Data
Edit `api/EComm.Api/Data/DatabaseSeeder.cs` to change initial tenants, products, and users.

### Upgrade to SQLServer
The API uses Entity Framework Core - swapping SQLite for SQLServer requires minimal changes:
1. Update connection string in `appsettings.json`
2. Change `UseSqlite()` to `UseSqlServer()` in `Program.cs`
3. Run EF migrations

---

## API Overview

All endpoints are prefixed with `/api/v1/`. Full Swagger documentation available at `/swagger`.

### Products
```
GET/POST   /products              # List/create products
GET/PUT/DELETE /products/{id}     # Product CRUD
GET   /products/{id}/versions     # Version history
POST  /products/{id}/versions/{v}/restore  # Restore version
```

### Orders
```
GET   /admin/orders               # Admin order list
PUT   /admin/orders/{id}/status   # Update order status
```

### Cart
```
GET   /cart                       # Get cart
POST  /cart/items                 # Add item
PUT   /cart/items/{id}            # Update quantity
DELETE /cart/items/{id}           # Remove item
```

### Tenants & Markets
```
GET/POST   /tenants               # Tenant management
GET/POST   /markets               # Market management
POST       /api-keys              # Generate API keys
```

---

## Documentation

- [CLAUDE.md](CLAUDE.md) - AI assistant guide and project overview
- [docs/STATUS.md](docs/STATUS.md) - Implementation status
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Technical architecture
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Development workflow
- [frontend/CLAUDE.md](frontend/CLAUDE.md) - Frontend guide
- [api/CLAUDE.md](api/CLAUDE.md) - API backend guide
- [showcase-dotnet/CLAUDE.md](showcase-dotnet/CLAUDE.md) - Showcase guide

---

## Roadmap

- [ ] OAuth2/OIDC authentication
- [ ] Real payment gateway integration
- [ ] Email notifications
- [ ] Customer order tracking
- [ ] Umbraco CMS integration
- [ ] Docker deployment configuration

---

## AI-Assisted Development

We acknowledge that the world is changing dynamically, and we're committed to keeping up with modern development practices. This project embraces AI tooling where responsible use principles allow.

You'll find `CLAUDE.md` files throughout the solution - these provide context for [Claude Code](https://claude.ai/claude-code) and similar AI assistants. Feel free to:
- Use these files as-is when working with Claude
- Adapt them for other AI coding assistants
- Extend them with your own project-specific context

These files help AI assistants understand the codebase structure, conventions, and domain-specific patterns.

---

## License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

You are free to:
- Use this project commercially
- Modify and distribute
- Use for private purposes

Requirements:
- Include the original license and copyright notice
- State changes made to the code

---

## Support & Contact

**Built by [UKAD](https://ukad-group.com)**

For questions, bug reports, or feature requests:
- Open an issue on GitHub
- Contact us at hi@ukad-group.com

---

**Happy building!**
