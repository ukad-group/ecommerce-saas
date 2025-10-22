# Quick Start Guide

This guide will help you start building features for the eCommerce SaaS MVP using spec-driven development.

## Prerequisites

- Claude Code (or another AI coding agent)
- Git initialized (already done)
- Read [memory/constitution.md](memory/constitution.md) to understand project principles

## The Spec-Driven Workflow

### Step 1: Create a Feature Specification

Use the `/speckit.specify` slash command to describe what you want to build. Focus on **WHAT** and **WHY**, not the technical implementation.

**Example:**

```
/speckit.specify Create a product catalog management system for the back-office admin interface.
Administrators need to add, edit, and delete products. Each product has:
- Basic info: name, description, SKU
- Pricing: base price, optional sale price
- Inventory: stock quantity, low stock threshold
- Organization: assign to one or more categories
- Variants: different sizes, colors with separate pricing and inventory

Products should support rich text descriptions, multiple images, and SEO metadata.
Categories can be hierarchical (parent/child relationships).
The system should warn admins when products are low on stock.
```

**What happens:**
1. Claude will generate a concise short name (e.g., "product-catalog")
2. Create a new feature branch
3. Generate a comprehensive specification in `specs/[number]-[short-name]/spec.md`
4. Create a requirements checklist
5. Validate the specification quality
6. Ask clarifying questions if needed (max 3 questions)

**Output:** A complete, validated specification ready for technical planning

---

### Step 2: Create a Technical Plan

Use the `/speckit.plan` slash command to define your technical approach.

**Example:**

```
/speckit.plan Use .NET 8 Web API with ASP.NET Core for the backend.
PostgreSQL database with Entity Framework Core.
React with TypeScript for the admin UI.
Use React Query for API state management.
Implement API-first: create OpenAPI spec and mock endpoints before real implementation.
Support multi-tenancy at database level with tenant isolation.
Use Azure Blob Storage for product images.
```

**What happens:**
1. Claude generates a detailed technical implementation plan
2. Defines API contracts (OpenAPI/Swagger)
3. Creates database schema design
4. Outlines component architecture
5. Identifies testing requirements

**Output:** `specs/[number]-[short-name]/plan.md` with complete technical design

---

### Step 3: Break Down Into Tasks

Use the `/speckit.tasks` slash command to generate an actionable task list.

**Example:**

```
/speckit.tasks
```

**What happens:**
1. Claude analyzes the spec and plan
2. Generates a prioritized, sequential task list
3. Creates `specs/[number]-[short-name]/tasks.md`
4. Each task is actionable and testable

**Output:** A detailed task breakdown ready for implementation

---

### Step 4: Implement the Feature

Use the `/speckit.implement` slash command to start building.

**Example:**

```
/speckit.implement
```

**What happens:**
1. Claude follows TDD (Test-Driven Development)
2. Implements tasks in order
3. Writes tests before implementation
4. Creates mocks for UI development
5. Implements backend after UI validation
6. Runs all tests

**Output:** Working, tested implementation

---

## Example: Your First Feature

Let's create a simple admin authentication feature to get started:

### 1. Specify

```
/speckit.specify Create basic admin authentication for the back-office.
Admins should be able to log in with email and password.
Support "remember me" functionality.
Include password reset via email.
After login, admins land on a dashboard showing summary stats.
Session should expire after 30 minutes of inactivity.
```

### 2. Plan

```
/speckit.plan Use ASP.NET Core Identity with JWT tokens.
React frontend with React Router for navigation.
Secure cookies for token storage.
Email sending via SendGrid.
PostgreSQL for user storage.
API endpoints: /auth/login, /auth/logout, /auth/forgot-password, /auth/reset-password
```

### 3. Generate Tasks

```
/speckit.tasks
```

### 4. Implement

```
/speckit.implement
```

---

## Additional Commands

### `/speckit.clarify`

Use this if you need to clarify or refine an existing specification:

```
/speckit.clarify Add support for two-factor authentication via SMS
```

### `/speckit.analyze`

Analyze existing specifications to understand the project:

```
/speckit.analyze
```

### `/speckit.constitution`

Review the project constitution (principles and guidelines):

```
/speckit.constitution
```

---

## Key Principles to Remember

1. **API-First**: Always define API contracts before implementation
2. **Mock-First UI**: Build UI with mocks, validate UX, then implement backend
3. **Test-Driven**: Write tests before implementation code
4. **Simplicity**: Start simple, add complexity only when needed
5. **Multi-Tenant Ready**: Design for SaaS from day one

---

## Project Structure After First Feature

```
eComm/
├── .claude/
│   └── commands/          Spec-kit slash commands
├── memory/
│   └── constitution.md    Project principles
├── specs/
│   └── 001-product-catalog/
│       ├── spec.md        Feature specification
│       ├── plan.md        Technical plan
│       ├── tasks.md       Task breakdown
│       └── checklists/    Quality checklists
├── src/
│   ├── api/               Backend API
│   ├── ui/                Frontend app
│   └── shared/            Shared contracts
├── mocks/                 Mock API implementations
├── tests/                 Test suites
└── README.md
```

---

## Next Steps

1. Read the [constitution](memory/constitution.md)
2. Create your first specification with `/speckit.specify`
3. Follow the workflow: specify → plan → tasks → implement
4. Start with a core feature like product catalog or admin auth

---

## Getting Help

- Type `/help` for Claude Code help
- Review [memory/constitution.md](memory/constitution.md) for project guidelines
- Check [README.md](README.md) for project overview
- Explore [spec-kit documentation](https://github.com/github/spec-kit)

Happy building!
