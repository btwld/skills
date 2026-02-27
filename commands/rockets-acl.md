---
description: Add or modify access control for a Rockets SDK resource. Updates AppResource enum, acRules, and Access Query Service with ownership logic via queryServices pattern.
---

# Rockets ACL Command

Configures access control for a resource following the Rockets ACL pattern.

## What This Command Does

1. **Review current ACL** — read `app.acl.ts` for existing roles and resources
2. **Add resource** — update `AppResource` enum if new
3. **Configure rules** — add `acRules.grant()` for all roles
4. **Implement Access Query Service** — with `@InjectDynamicRepository` for ownership checks
5. **Register via queryServices** — in AccessControlModule/RocketsAuthModule config
6. **Verify** — run `validate.js` and build

## Usage

```
/rockets-acl Product
/rockets-acl Product with admin:any user:own
```

## How It Works

Access query services are registered via `queryServices` in `AccessControlModule.forRoot()` extras. The guard resolves them from its own scope. Feature modules do NOT need ACL providers.

If the module was generated with `rockets-crud-generator` using `acl` config, all of this is already done automatically by `integrate.js`. Use this command only for:
- Adding ACL to an existing module that was generated without it
- Changing ACL rules after generation
- Manual ACL setup for non-generated modules

## Source of Truth

- `CLAUDE.md`
- `development-guides/ACCESS_CONTROL_GUIDE.md`
- `skills/rockets-access-control/SKILL.md`
