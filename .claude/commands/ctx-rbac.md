Review role-based access control implementation before proceeding.

## RBAC Context

**Status**: Partially implemented (superadmin complete, tenant roles need work)

### Roles

**Superadmin**:
- See and manage all tenants and markets
- Create tenants and markets
- Full access to all features
- No tenant selection required

**Tenant Admin**:
- Select tenant at login
- Full access within selected tenant
- Create markets within tenant
- Cannot create tenants

**Tenant User**:
- Select tenant at login
- View all data within tenant
- Edit products and categories only
- Cannot create markets or edit orders

### Data Model
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'tenant_admin' | 'tenant_user';
}

interface AuthSession {
  user: UserProfile;
  tenantId?: string;        // For tenant_admin and tenant_user
  marketId?: string;        // Auto-selected on login
  isAuthenticated: boolean;
}
```

### Implemented
✅ Login page with profile selector
✅ Superadmin login flow
✅ Tenant selector for scoped roles
✅ Auth state (Zustand + localStorage)
✅ Protected routes
✅ Session persistence
✅ User info display with logout

### Not Implemented
❌ Tenant admin login flow (selector shown but not fully working)
❌ Tenant user login flow
❌ Permission-based UI hiding/disabling
❌ Tenant filtering in API calls (headers sent but not always enforced)

### Mock Users (Hardcoded)
```typescript
// In frontend/src/data/profiles.ts
{
  id: '1',
  name: 'Super Admin',
  email: 'admin@system.com',
  role: 'superadmin'
},
{
  id: '2',
  name: 'Admin (Demo Store)',
  email: 'admin@demo.com',
  role: 'tenant_admin'
},
{
  id: '3',
  name: 'Catalog Manager (Demo Store)',
  email: 'manager@demo.com',
  role: 'tenant_user'
}
```

### Components
- **LoginPage**: Profile selector + tenant selector
- **ProfileSelector**: Choose user role
- **TenantSelector**: Choose tenant (for scoped roles)
- **UserInfo**: Display user + logout button
- **ProtectedRoute**: Route wrapper requiring auth

### State Management
```typescript
// authStore (Zustand)
{
  user: UserProfile | null,
  tenantId: string | null,
  marketId: string | null,
  login: (user, tenantId?, marketId?) => void,
  logout: () => void,
  isAuthenticated: boolean
}
```

### Route Protection
```typescript
// All /admin/* routes require auth
<Route element={<ProtectedRoute />}>
  <Route path="/admin" element={<AdminDashboardPage />} />
  <Route path="/admin/products" element={<ProductsPage />} />
  // ...
</Route>
```

### Permissions Logic
```typescript
// Check permissions
const canEdit = user.role !== 'tenant_user' ||
                (path === '/admin/products' || path === '/admin/categories');

const canCreate = user.role !== 'tenant_user';

// Filter data by tenant
const filteredData = user.role === 'superadmin'
  ? allData
  : allData.filter(item => item.tenantId === user.tenantId);
```

### Important Notes
- **Hardcoded auth**: No real passwords, just profile selection
- **No API auth**: API doesn't validate tokens (prototype)
- **Headers sent**: `X-Tenant-ID` and `X-Market-ID` sent but not always enforced
- **Future**: Replace with OAuth2/OIDC

### Common Tasks
**Add permission check**: Check authStore.user.role in component
**Hide feature by role**: Conditional rendering based on role
**Add protected route**: Wrap with ProtectedRoute in router
**Change tenant**: authStore.login() with new tenantId
