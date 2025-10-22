# eCommerce SaaS MVP

A minimal viable product for a standalone eCommerce back-office solution designed for easy integration with Umbraco, Optimizely, and other CMS platforms.

## Project Philosophy

This project follows **Spec-Driven Development** using [GitHub's spec-kit](https://github.com/github/spec-kit) methodology. We build specifications first, develop UI with API mocks, then implement the actual backend infrastructure.

### Key Principles

1. **API-First**: Define contracts before implementation
2. **Mock-First UI**: Build and validate UI against mocks
3. **Multi-Platform Ready**: Easy CMS integration
4. **SaaS-First**: Multi-tenant from day one
5. **MVP Focus**: Core features only, defer complexity

See [memory/constitution.md](memory/constitution.md) for complete project principles and guidelines.

## Getting Started with Spec-Kit

This project uses spec-kit slash commands to drive development:

### Available Commands

- `/speckit.specify` - Create a feature specification
- `/speckit.clarify` - Clarify requirements in a spec
- `/speckit.plan` - Create technical implementation plan
- `/speckit.tasks` - Generate actionable task list
- `/speckit.implement` - Implement the planned feature
- `/speckit.analyze` - Analyze existing specifications
- `/speckit.constitution` - Review project constitution

### Workflow

1. **Specify**: Describe what you want to build (focus on WHAT and WHY)
   ```
   /speckit.specify Build a product catalog that allows managing products with variants,
   pricing tiers, and inventory tracking. Products can be organized into categories...
   ```

2. **Clarify** (if needed): Answer any clarification questions

3. **Plan**: Define the technical approach and architecture
   ```
   /speckit.plan Use .NET 8 Web API with PostgreSQL. Frontend using React with
   TypeScript. API-first with OpenAPI docs...
   ```

4. **Tasks**: Break down into implementable tasks
   ```
   /speckit.tasks
   ```

5. **Implement**: Build the feature following the tasks
   ```
   /speckit.implement
   ```

## Project Structure

```
/specs/          Feature specifications (one per feature)
/memory/         Project constitution and shared knowledge
/scripts/        Spec-kit automation scripts
/templates/      Spec-kit templates for specs, plans, tasks
/.claude/        Claude Code slash commands
/src/            Source code (created during implementation)
/tests/          Test suites (created during implementation)
/mocks/          Mock API implementations
```

## Next Steps

### 1. Review the Constitution

Read through [memory/constitution.md](memory/constitution.md) to understand the project's core principles and technical constraints.

### 2. Create Your First Specification

Start with a core eCommerce feature. For example:

```
/speckit.specify Create a product catalog management system for the back-office.
Admin users should be able to create, edit, and delete products. Each product has
a name, description, SKU, price, and inventory count. Products can be organized
into categories. Support product variants (size, color, etc.) with different
prices and inventory...
```

### 3. Follow the Spec-Driven Workflow

The spec-kit commands will guide you through:
- Validating your specification
- Creating a technical plan
- Breaking down into tasks
- Implementing with tests

## Technology Stack (Planned)

- **Backend**: .NET 8+ (ASP.NET Core)
- **Database**: PostgreSQL
- **Frontend**: TBD (React/Vue/Svelte)
- **API**: RESTful with OpenAPI/Swagger
- **Auth**: OAuth2/OIDC
- **Deployment**: Docker/Kubernetes

## Contributing

All development follows the spec-driven methodology:

1. Start with a specification using `/speckit.specify`
2. Get spec reviewed and approved
3. Create technical plan with `/speckit.plan`
4. Generate tasks with `/speckit.tasks`
5. Implement following TDD principles
6. Submit PR linking to the spec

## Documentation

- [Constitution](memory/constitution.md) - Project principles and guidelines
- [Specifications](specs/) - Individual feature specs
- [Spec-Kit Documentation](https://github.com/github/spec-kit) - Methodology details

## License

TBD
