# ACCESS CONTROL GUIDE

> **For AI Tools**: This guide contains role-based access control patterns and permission management for Rockets SDK. Use this when implementing security and authorization in your modules.

## Quick Reference

| Task | Section | Time |
|------|---------|------|
| **Setup ACL from scratch** | [ACL Setup & Configuration](#acl-setup--configuration) | **15 min** |
| Understand user roles structure | [AuthorizedUser Interface](#authorizeduser-interface) | 5 min |
| Configure default roles | [Default Role Assignment on Signup](#default-role-assignment-on-signup) | 10 min |
| Create access query service | [Access Query Service Pattern](#access-query-service-pattern) | 10 min |
| Add controller decorators | [Controller Access Control](#controller-access-control) | 5 min |
| Implement ownership filtering | [Controller-Level Ownership Filtering](#controller-level-ownership-filtering) | 10 min |
| Define resource types | [Resource Type Definitions](#resource-type-definitions) | 5 min |
| Role-based permissions | [Role Permission Patterns](#role-permission-patterns) | 15 min |
| Custom access logic | [Business Logic Access Control](#business-logic-access-control) | 20 min |

---

## Core Concepts

### Access Control Flow

```
Request -> Authentication -> Access Guard -> Access Query Service -> Permission Check -> Allow/Deny
```

### Key Components

1. **Resource Types**: Define what can be accessed (`artist-one`, `artist-many`)
2. **Access Query Service**: Implements permission logic (`CanAccess` interface)
3. **Decorators**: Apply access control to controller endpoints
4. **Context**: Provides request, user, and query information
5. **Role System**: Hierarchical user roles and permissions
6. **ACL Rules**: Define role-based permissions using `accesscontrol` library

---

## ACL Setup & Configuration

### Step 1: Install Required Package

```bash
yarn add accesscontrol
```

### Step 2: Create ACL Rules File

Create `src/app.acl.ts` with role and resource enums plus `accesscontrol` grants.

**ACL rule pattern:**

```typescript
import { AccessControl } from 'accesscontrol';

export enum AppRole { Admin = 'admin', Manager = 'manager', User = 'user' }
export enum AppResource { Pet = 'pet', PetVaccination = 'pet-vaccination' }

const allResources = Object.values(AppResource);
export const acRules: AccessControl = new AccessControl();

// Admin: full access to all resources
acRules.grant([AppRole.Admin]).resource(allResources)
  .createAny().readAny().updateAny().deleteAny();

// Manager: CRUD without delete
acRules.grant([AppRole.Manager]).resource(allResources)
  .createAny().readAny().updateAny();

// User: ownership-based only (Access Query Service verifies ownership)
acRules.grant([AppRole.User]).resource(allResources)
  .createOwn().readOwn().updateOwn().deleteOwn();
```

### Step 3: Create Access Control Service

Create `src/access-control.service.ts` implementing `AccessControlServiceInterface`:

```typescript
@Injectable()
export class ACService implements AccessControlServiceInterface {
  async getUser<T>(context: ExecutionContext): Promise<T> {
    return context.switchToHttp().getRequest().user as T;
  }

  async getUserRoles(context: ExecutionContext): Promise<string[]> {
    const jwtUser = await this.getUser<{
      id: string;
      userRoles?: { role: { name: string } }[];
    }>(context);
    if (!jwtUser?.id) throw new UnauthorizedException();
    return jwtUser.userRoles?.map(ur => ur.role.name) || [];
  }
}
```

### Step 4: Integrate with RocketsAuthModule (CRITICAL)

> **CRITICAL**: The `acRules` defined in `app.acl.ts` must be wired into the module system. Without this, `AccessControlGuard` and `@AccessControlQuery` decorators have no rules to evaluate -- all access checks silently fail or throw DI errors at runtime.

In `src/app.module.ts`, pass `acRules` and `ACService` into `RocketsAuthModule.forRootAsync()`:

```typescript
RocketsAuthModule.forRootAsync({
  useFactory: () => ({
    settings: {
      role: {
        adminRoleName: AppRole.Admin,
        defaultUserRoleName: AppRole.User,
      },
    },
    accessControl: {
      service: new ACService(),
      settings: { rules: acRules },
    },
  }),
})
```

### ACL Permission Patterns

**Any vs Own permissions:**

- `.createAny()` / `.readAny()` / `.updateAny()` / `.deleteAny()` -- Access to any resource
- `.createOwn()` / `.readOwn()` / `.updateOwn()` / `.deleteOwn()` -- Access only to owned resources

**Usage in Access Query Services:**

The `query.possession` will be:
- `'any'` for Any permissions -- Grant access to all resources
- `'own'` for Own permissions -- Verify ownership before granting access

```typescript
async canAccess(context: AccessControlContextInterface): Promise<boolean> {
  const query = context.getQuery();
  if (query.possession === 'any') return true;   // Admin/Manager
  if (query.possession === 'own') {
    return this.checkOwnership(user, entityId);   // User role
  }
  return false;
}
```

---

## AuthorizedUser Interface

The authenticated user object follows this structure:

```typescript
export interface AuthorizedUser {
  id: string;
  sub: string;
  email?: string;
  userRoles?: { role: { name: string } }[];
  claims?: Record<string, unknown>;
}
```

**Extracting role names:**
```typescript
const roleNames = user.userRoles?.map(ur => ur.role.name) || [];
const hasAdminRole = roleNames.includes(AppRole.Admin);
```

**Why nested structure?**
- Matches database schema (user -> userRoles -> role)
- Avoids conflicts with custom code that may use `roles` property
- Allows future expansion (role metadata, permissions)
- Type-safe with AppRole enum

---

## Default Role Assignment on Signup

**Configuration** (inside `RocketsAuthModule.forRootAsync()`):

```typescript
settings: {
  role: {
    adminRoleName: AppRole.Admin,
    defaultUserRoleName: AppRole.User, // Automatically assigned on signup
  },
}
```

**Bootstrap initialization** -- ensure default roles exist before users sign up by querying `RoleModelService` at startup and calling `create()` for any missing roles.

**How it works:**
- When a user signs up via `/signup`, the system checks if `defaultUserRoleName` is configured
- If configured and the role exists, it is automatically assigned to the new user
- This ensures all users have at least one role, preventing access control errors

---

## Resource Type Definitions

### Basic Resource Types (Constants Pattern)

```typescript
// artist.constants.ts
export const ArtistResource = {
  One: 'artist-one',
  Many: 'artist-many',
} as const;

export type ArtistResourceType = typeof ArtistResource[keyof typeof ArtistResource];
```

### Advanced Resource Types with Actions

For entities that have custom operations beyond CRUD, extend the resource object:

```typescript
export const SongResource = {
  One: 'song-one',
  Many: 'song-many',
  Upload: 'song-upload',
  Approve: 'song-approve',
  Publish: 'song-publish',
} as const;
```

### Multi-Entity / Cross-Entity Resource Types

```typescript
export const AlbumResource = {
  One: 'album-one',
  Many: 'album-many',
  Songs: 'album-songs',
  Artists: 'album-artists',
} as const;
```

---

## Access Query Service Pattern

### Basic Implementation

> Generated by `rockets-crud-generator` skill (see `skills/rockets-crud-generator/SKILL.md`). The generator produces a fail-secure stub for each module. Below is the conceptual pattern.

**Key points:**
- Implements `CanAccess` from `@concepta/nestjs-access-control`
- `context.getUser()` and `context.getRequest()` return `unknown` -- add type assertions
- Entity id comes from `context.getRequest()?.params?.id` (NOT `query.subjectId`)
- Default to `return false` (fail secure)

```typescript
@Injectable()
export class ArtistAccessQueryService implements CanAccess {
  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const user = context.getUser() as { id?: string } | undefined;
    const request = context.getRequest() as any;
    const query = context.getQuery();
    const entityId = request?.params?.id;

    if (!user?.id) return false;

    // Role dispatch: Admin -> full, others -> ownership check
    return this.checkRoleBasedAccess(user, query, entityId);
  }
}
```

### Advanced Access Query with Business Logic (Ownership)

The ownership pattern injects a model service and verifies the requesting user owns the entity:

```typescript
@Injectable()
export class SongAccessQueryService implements CanAccess {
  constructor(private songModelService: SongModelService) {}

  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const user = context.getUser() as { id?: string } | undefined;
    const request = context.getRequest() as any;
    const query = context.getQuery();
    if (!user?.id) return false;

    const songId = request?.params?.id;
    if (songId) {
      const song = await this.songModelService.byId(songId);
      const isOwner = song?.createdBy === user.id;
      if (isOwner && ['read', 'update'].includes(query.action)) return true;
    }
    return false;
  }
}
```

---

## Controller Access Control

### Standard CRUD Controller with Access Control

> Generated by `rockets-crud-generator` skill. See `skills/rockets-crud-generator/SKILL.md`.

The decorator pattern for a CRUD controller:

```typescript
@CrudController({ path: 'artists', model: { type: ArtistDto, paginatedType: ArtistPaginatedDto } })
@AccessControlQuery({ service: ArtistAccessQueryService })
export class ArtistCrudController {
  @CrudReadMany()
  @AccessControlReadMany(ArtistResource.Many)
  async getMany(/* ... */) { /* ... */ }

  @CrudCreateOne({ dto: ArtistCreateDto })
  @AccessControlCreateOne(ArtistResource.One)
  async createOne(/* ... */) { /* ... */ }

  // ... updateOne, deleteOne follow the same pattern
}
```

### Custom Controller with Granular Access Control

For non-CRUD endpoints (approve, publish, custom queries), use `@AccessControlGrant`:

```typescript
@Controller('songs')
@UseGuards(AuthGuard('jwt'))
export class SongCustomController {
  @Post(':id/approve')
  @AccessControlGrant({
    resource: SongResource.Approve,
    action: 'update',
    service: SongAccessQueryService,
  })
  async approveSong(@Param('id') id: string) { /* ... */ }
}
```

### Non-CRUD Controller Access Control

Custom controllers (reports, aggregations, dashboards) that do NOT use `@CrudController` still need proper ACL wiring. Do NOT use only `@UseGuards(AccessControlGuard)` -- you MUST also add `@AccessControlQuery` and per-endpoint decorators:

```typescript
@Controller('reports')
@AccessControlQuery({ service: ReportAccessQueryService })
export class ReportController {
  @Get('tasks/by-status')
  @AccessControlReadMany(ReportResource.Many)
  async getTaskSummaryByStatus() { /* ... */ }
}
```

> **WRONG**: Using `@UseGuards(AccessControlGuard)` alone without `@AccessControlQuery` and per-endpoint decorators. The guard will have no query context to evaluate, resulting in unpredictable behavior.

---

### Controller-Level Ownership Filtering

For ownership-based permissions (`readOwn`, `updateOwn`, etc.), automatically filter data in the controller so users only see their own resources.

**Decision tree:**
1. Extract role names: `user.userRoles?.map(ur => ur.role.name) || []`
2. Check if user has only the base role (no Admin/Manager)
3. If ownership-only, inject a `userId` filter into `crudRequest.parsed.filter`
4. Admins/Managers skip the filter and see all records

**Key snippet -- modifying CrudRequest for ownership filtering:**

```typescript
if (hasOnlyUserRole) {
  const modifiedRequest = {
    ...crudRequest,
    parsed: {
      ...(crudRequest.parsed || {}),
      filter: [
        ...((crudRequest.parsed?.filter as any[]) || []),
        { field: 'userId', operator: '$eq', value: user.id },
      ],
    },
  };
  return this.petCrudService.getMany(modifiedRequest);
}
return this.petCrudService.getMany(crudRequest); // Admin/Manager
```

**When to use:**
- Use controller filtering for **list operations** (`getMany`) to automatically filter by ownership
- Use Access Query Service for **ownership checks on single entities** (`getOne`, `update`, `delete`)
- Combine both approaches for complete ownership-based access control

**Benefits:**
- Users automatically see only their own data without additional queries
- Prevents Insecure Direct Object Reference (IDOR) vulnerabilities
- Type-safe with `AppRole` enum

---

## Role Permission Patterns

### Role Hierarchy Definition

```typescript
export enum UserRole {
  ADMIN = 'Admin',
  IMPRINT_ARTIST = 'ImprintArtist',
  CLERICAL = 'Clerical',
  USER = 'User',
}

export const RoleHierarchy = {
  [UserRole.ADMIN]: 100,
  [UserRole.IMPRINT_ARTIST]: 75,
  [UserRole.CLERICAL]: 50,
  [UserRole.USER]: 25,
} as const;
```

### Permission Checking Utilities

```typescript
export class PermissionUtils {
  static hasPermission(userRole: UserRole, resource: string, action: string): boolean {
    const perms = RolePermissions[userRole];
    return (perms?.[resource] || []).includes(action);
  }

  static hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
    return (RoleHierarchy[userRole] || 0) >= (RoleHierarchy[requiredRole] || 0);
  }

  static getHighestRole(user: { userRoles?: { role: { name: string } }[] }): UserRole {
    const roles = user.userRoles?.map(ur => ur.role.name as UserRole) || [];
    return roles.sort((a, b) => (RoleHierarchy[b] || 0) - (RoleHierarchy[a] || 0))[0] || UserRole.USER;
  }
}
```

### Enhanced Access Query with Permission Utils

Combine `PermissionUtils` with the `CanAccess` interface for cleaner logic:

```typescript
@Injectable()
export class EnhancedAccessQueryService implements CanAccess {
  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const user = context.getUser() as any;
    if (!user) return false;

    const userRole = PermissionUtils.getHighestRole(user);
    const resource = query.resource.replace(/-one|-many/, 's');
    if (!PermissionUtils.hasPermission(userRole, resource, query.action)) return false;

    return this.checkBusinessLogic(user, query, context);
  }
}
```

---

## Business Logic Access Control

### Ownership-Based Access Control

The ownership pattern combines role checks with entity-level ownership verification:

1. **Admin** bypasses all checks
2. For single-entity operations, fetch the entity and compare `createdBy` or owner FK with `user.id`
3. Owners can read/update; only Admins can delete
4. Wrap ownership checks in try/catch -- fail secure on errors

```typescript
private async checkSongOwnership(user: any, action: string, songId: string): Promise<boolean> {
  try {
    const song = await this.songModelService.byId(songId);
    const isOwner = song?.createdBy === user.id || song?.artist?.userId === user.id;
    return isOwner && ['read', 'update'].includes(action);
  } catch {
    return false; // Fail secure
  }
}
```

### Time-Based Access Control

Restrict access by time of day or maintenance windows:

```typescript
private checkTimeRestrictions(user: any): boolean {
  const now = new Date();
  const roleNames = user.userRoles?.map(ur => ur.role.name) || [];

  // Clerical: business hours only (9-18, Mon-Fri)
  if (roleNames.includes('Clerical')) {
    const day = now.getDay(), hour = now.getHours();
    if (day === 0 || day === 6 || hour < 9 || hour >= 18) return false;
  }

  // Maintenance window: only Admins
  if (this.isMaintenanceWindow(now) && !roleNames.includes('Admin')) return false;

  return true;
}
```

---

## Best Practices

### 1. Use Constants for Resources
```typescript
// Good
@AccessControlReadMany(ArtistResource.Many)
// Avoid hard-coded strings
@AccessControlReadMany('artist-many')
```

### 2. Implement Hierarchical Role Checking
```typescript
// Good
private hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}
// Avoid: if (userRole === 'Admin' || userRole === 'Manager') {}
```

### 3. Log Access Decisions
```typescript
console.log(`Access ${allowed ? 'granted' : 'denied'}: User ${user.id} (${userRole}) ` +
  `requesting ${action} on ${resource} (Entity: ${entityId})`);
```

### 4. Handle Errors Gracefully
```typescript
try {
  return await this.checkOwnership(user.id, entityId);
} catch (error) {
  console.error('Ownership check failed:', error);
  return false; // Fail secure
}
```

### 5. Structure canAccess with Layered Checks
```typescript
async canAccess(context): Promise<boolean> {
  if (!user) return false;               // 1. Authentication
  if (!this.hasBasicPermission()) return false; // 2. Permission
  return this.checkBusinessRules();       // 3. Business logic
}
```

---

## Testing Access Control

### Unit Tests for Access Query Service

```typescript
describe('ArtistAccessQueryService', () => {
  it('should allow admin full access', async () => {
    mockContext.getUser.mockReturnValue({ id: '1', roles: [{ name: 'Admin' }] });
    mockContext.getQuery.mockReturnValue({ resource: 'artist-one', action: 'delete' });
    expect(await service.canAccess(mockContext)).toBe(true);
  });

  it('should deny user delete access', async () => {
    mockContext.getUser.mockReturnValue({ id: '1', roles: [{ name: 'User' }] });
    mockContext.getQuery.mockReturnValue({ resource: 'artist-one', action: 'delete' });
    expect(await service.canAccess(mockContext)).toBe(false);
  });
});
```

---

## Integration with Module System

The module must register the Access Query Service as a provider and export it for cross-module use. Key requirements:

- `TypeOrmModule.forFeature([Entity])` so the adapter gets the repository
- `AccessControlModule` imported
- `ArtistAccessQueryService` in both `providers` and `exports`

> Generated by `rockets-crud-generator` skill. See `skills/rockets-crud-generator/SKILL.md` for the full module template.

---

## Success Checklist

Your access control implementation is secure when:
- All endpoints have appropriate access decorators
- Role hierarchy is properly defined and enforced
- Ownership checks are implemented for user-specific resources
- Business logic restrictions are properly applied
- Access decisions are logged for auditing
- Error cases fail securely (deny by default)
- Time-based and context-based restrictions work correctly

---

## Related Guides

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Test access control and permissions
- [CRUD_PATTERNS_GUIDE.md](./CRUD_PATTERNS_GUIDE.md) - CRUD implementation with access control
- [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) - Configure access control module
- [ROCKETS_AI_INDEX.md](./ROCKETS_AI_INDEX.md) - Navigation hub
