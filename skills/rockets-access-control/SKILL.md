---
name: rockets-access-control
description: Use this skill when implementing access control, adding roles/resources, or configuring ACL rules in Rockets SDK projects.
---

# Rockets Access Control Skill

## Primary Reference

Read `development-guides/ACCESS_CONTROL_GUIDE.md` in the project for the full pattern with code examples.

## How ACL Works (queryServices pattern)

Access query services are registered via `queryServices` in `AccessControlModule.forRoot()` or `RocketsAuthModule.forRootAsync()`. The `AccessControlGuard` resolves them from its own module scope. Feature modules stay clean — no ACL providers needed.

### Quick Workflow

1. **Define resource constants** in `src/modules/{name}/constants/{name}.constants.ts`
2. **Add to AppResource enum** in `app.acl.ts`
3. **Define ACL rules** in `app.acl.ts` (`acRules.grant()`)
4. **Access query service** — uses `@InjectDynamicRepository` for ownership checks, registered via `queryServices` in AccessControlModule config
5. **Controller decorators** — `@UseGuards(AccessControlGuard)`, `@AccessControlQuery`, `@AccessControlReadMany`, etc.

### Access Query Service Pattern

```typescript
@Injectable()
export class ProductAccessQueryService implements CanAccess {
  constructor(
    @InjectDynamicRepository(PRODUCT_MODULE_PRODUCT_ENTITY_KEY)
    private productRepo: RepositoryInterface<ProductEntity>,
  ) {}

  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const query = context.getQuery();
    const user = context.getUser() as { id?: string } | undefined;
    if (!query || !user?.id) return false;        // fail-secure
    if (query.possession === 'any') return true;   // admin
    if (query.possession === 'own') {
      const request = context.getRequest() as { params?: { id?: string } } | undefined;
      const entityId = request?.params?.id;
      if (!entityId) return false;
      const entity = await this.productRepo.findOne({ where: { id: entityId } });
      return (entity as any)?.userId === user.id;
    }
    return false;                                  // default deny
  }
}
```

### Registration (app.module.ts)

```typescript
// In RocketsAuthModule or AccessControlModule config:
accessControl: {
  settings: { rules: acRules },
  queryServices: [ProductAccessQueryService, TaskAccessQueryService],
}
```

The `integrate.js` script handles this automatically when generating modules with ACL config.

## Generator Integration

When using `rockets-crud-generator` with `acl` config, everything is generated automatically:
- Access query service with `@InjectDynamicRepository`
- ACL resource enum + grants for `app.acl.ts`
- queryServices wiring for `app.module.ts`

See `skills/rockets-crud-generator/SKILL.md` for config format.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 403 on all requests | Resource not in acRules | Add `acRules.grant()` in `app.acl.ts` |
| 403 for users only | Missing Own permissions | Add `createOwn`/`readOwn`/etc. |
| Access Query always denies | Default `return false` | Implement ownership check in `canAccess()` |
| 500 "provider does not exist" | Access query service in feature module | Move to `queryServices` in AccessControlModule config |
| Users see all resources | No ownership filtering | Implement `readOwn` in Access Query using `@InjectDynamicRepository` |

## Full Reference

`development-guides/ACCESS_CONTROL_GUIDE.md`
