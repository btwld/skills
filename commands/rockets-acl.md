---
description: Add or modify access control for a Rockets SDK resource. Updates AppResource enum, acRules, and Access Query Service with ownership/business logic.
---

# Rockets ACL Command

Configures access control for a resource following the Rockets ACL pattern.

## What This Command Does

1. **Review current ACL** — read `app.acl.ts` for existing roles and resources
2. **Add resource** — update `AppResource` enum if new
3. **Configure rules** — add `acRules.grant()` for all roles
4. **Implement Access Query Service** — ownership and business logic checks
5. **Update controller** — ensure access control decorators are correct
6. **Verify** — run build and check for security issues

## Usage

```
/rockets-acl Product
/rockets-acl Product with admin:any user:own
```

## ACL Pattern

```typescript
// 1. Resource enum
export enum AppResource {
  Product = 'product',
}

// 2. Rules
acRules.grant([AppRole.Admin]).resource('product').createAny().readAny().updateAny().deleteAny();
acRules.grant([AppRole.User]).resource('product').createOwn().readOwn().updateOwn().deleteOwn();

// 3. Access Query Service
@Injectable()
export class ProductAccessQueryService implements CanAccess {
  async canAccess(context: ExecutionContext): Promise<boolean> {
    const user = context.getUser();
    const query = context.getQuery();
    // Ownership check
    if (query.where?.userId && query.where.userId !== user.id) {
      return false;
    }
    return true;
  }
}

// 4. Controller decorators
@AccessControlReadMany({ resource: productResource.many })
@AccessControlCreateOne({ resource: productResource.one })
```

## Source of Truth

- `CLAUDE.md`
- `development-guides/ACCESS_CONTROL_GUIDE.md`
