---
name: rockets-access-control
description: This skill should be used when adding ACL to an existing module, modifying role-based access rules, debugging 403 errors, configuring ownership checks, or writing Access Query Services manually. For new modules, use rockets-crud-generator with ACL config instead — it generates all ACL wiring automatically.
---

# Rockets Access Control Skill

## When to Use This vs the Generator

- **New module with ACL** → use `rockets-crud-generator` with `acl` config — it generates all ACL wiring automatically
- **Adding ACL to existing module** → follow the Quick Workflow below
- **Modifying ACL rules post-generation** → follow the Quick Workflow below
- **Debugging access issues** → see Troubleshooting table below
- **Advanced patterns** (time-based, custom resources, role hierarchies) → read `development-guides/ACCESS_CONTROL_GUIDE.md`

## Quick Workflow (Manual ACL)

1. **Define resource constants** in `src/modules/{name}/constants/{name}.constants.ts`
2. **Add to AppResource enum** in `app.acl.ts`
3. **Define ACL rules** in `app.acl.ts` (`acRules.grant()`)
4. **Create Access Query Service** — uses `@InjectDynamicRepository` for ownership checks
5. **Register** in `queryServices` of AccessControlModule config (not in feature module)
6. **Add controller decorators** — `@UseGuards(AccessControlGuard)`, `@AccessControlQuery`, etc.

See `development-guides/ACCESS_CONTROL_GUIDE.md` for the full Access Query Service pattern and registration code.

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
