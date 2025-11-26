# Development Guide

## Running the Application

### 1. API Backend (Required)
```bash
cd api/EComm.Api
dotnet run
# http://localhost:5180
```

### 2. Admin Backoffice
```bash
cd frontend
npm install  # First time only
npm run dev
# http://localhost:5173
```

**Config** (frontend/.env.local):
```bash
VITE_TENANT_ID=tenant-a
VITE_API_BASE_URL=http://localhost:5180/api/v1
VITE_USE_MOCKS=false
```

### 3. Showcase Website (Optional)
```bash
cd showcase-dotnet/ECommShowcase.Web
dotnet run
# http://localhost:5025
```

## Development Workflow

### For New Features (YAGNI Approach)

**Simple features** (most cases):
1. Just start coding - no spec needed
2. Update `docs/STATUS.md` when done

**Complex features** (if truly needed):
1. Create minimal spec: `/specs/[number]-[feature-name]/spec.md`
2. Keep it simple (see template below)
3. Implement UI against mock API first
4. Validate UX
5. **Delete spec** and update `docs/STATUS.md`
6. Create slash command if feature is complex

**Minimal Spec Template**:
```markdown
# Feature: [Name]

## What & Why
[1-2 sentences: feature description + business value]

## User Stories
- As [role], I need [capability] so that [benefit]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Data Model (if applicable)
```typescript
interface NewEntity {
  id: string;
  // fields
}
```

## API Endpoints (if applicable)
```
GET/POST /api/v1/resource
GET/PUT/DELETE /api/v1/resource/:id
```

## Notes
[Any important implementation notes]
```

**Remember**: Specs are temporary artifacts. Delete them after implementation!

### For Bug Fixes
1. Write failing test
2. Fix the bug
3. Verify test passes
4. Update docs if behavior changed

### For Refactoring
1. Ensure tests exist and pass
2. Refactor code
3. Verify tests still pass
4. No behavior changes

## Coding Standards

**TypeScript**:
- Strict mode enabled
- Explicit return types on functions
- Interfaces over types for data models
- Use TanStack Query hooks for API calls

**React**:
- Functional components only
- Custom hooks for reusable logic
- Props interfaces for all components
- Use Tailwind classes (avoid inline styles)

**C#**:
- Follow .NET naming conventions
- Async/await for I/O operations
- Dependency injection where appropriate
- XML comments on public APIs

## Git Workflow

**Branch Naming**:
```bash
feature/[spec-number]-[short-name]
# Example: feature/001-product-catalog
```

**Commits**:
```bash
git commit -m "feat: Add product versioning support"
git commit -m "fix: Correct order total calculation"
git commit -m "refactor: Simplify auth store logic"
```

**No Direct Commits to Main**:
- Always create feature branch
- Create PR when ready
- Require passing tests + review

## Testing

**Frontend**:
```bash
cd frontend
npm run test           # Run tests
npm run type-check     # TypeScript check
```

**Backend**:
```bash
cd api/EComm.Api
dotnet test
```

## Troubleshooting

**API not responding**:
- Check it's running on port 5180
- Verify CORS enabled in Program.cs

**Frontend can't connect**:
- Verify VITE_API_BASE_URL in .env.local
- Ensure API backend is running first
- Check browser console for CORS errors

**Auth not working**:
- Check localStorage for authStore state
- Verify tenant/market IDs in session
- Clear localStorage and re-login

**Cart not persisting**:
- Admin: Check localStorage quota
- Showcase: Verify session enabled in Program.cs

**TypeScript errors**:
- Run `npm run type-check` in frontend
- Ensure types match API response structure

## Performance Standards

- API response: < 200ms (95th percentile)
- UI first paint: < 1.5s
- Test coverage: > 80%
- Zero console errors in production

## Core Principles

1. **API-First**: Define contracts before implementation
2. **Mock-First**: UI validated against mocks before backend work
3. **YAGNI**: Only build what's requested
4. **Test-Driven**: Write tests first, then code
5. **Keep It Simple**: Prefer simple over clever
