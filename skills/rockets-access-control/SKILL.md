---
name: rockets-access-control
description: Use this skill when implementing access control, adding roles/resources, or configuring ACL rules in Rockets SDK projects.
---

# Rockets Access Control Skill

## Primary Reference

Read `development-guides/ACCESS_CONTROL_GUIDE.md` in the project for the full pattern with code examples.

## Quick Workflow

### Adding ACL for a New Resource

1. **Define resource constants** in `src/modules/{name}/constants/{name}.constants.ts`:
   - `{name}Resource = { one: '{name}-one', many: '{name}-many' }`

2. **Add to AppResource** in `app.acl.ts`:
   - Add enum value

3. **Define ACL rules** in `app.acl.ts`:
   - Admin: `createAny/readAny/updateAny/deleteAny`
   - User: `createOwn/readOwn/updateOwn/deleteOwn` (or as needed)
   - **Avoid redundancy:** If Admin already has `resource(allResources)` (e.g. `acRules.grant([Admin]).resource(Object.values(AppResource))`), adding the new resource to `AppResource` is enough — no need to grant the same resource again in a separate block.

4. **Implement Access Query Service** implementing `CanAccess`:
   - Default to `return false` (fail secure)
   - Add ownership checks comparing `user.id` with entity owner FK
   - **Context API**: Use `context.getRequest()?.params?.id` for the entity id in single-resource ops. Do **not** use `query.subjectId` — `IQueryInfo` does not have `subjectId`.

5. **Module wiring when using AccessControlGuard**: If the controller uses `@UseGuards(AccessControlGuard)`, the **module** must provide the guard's dependencies so Nest can resolve them: `{ provide: 'ACCESS_CONTROL_MODULE_SETTINGS_TOKEN', useValue: { rules: acRules } }` and `{ provide: AccessControlService, useClass: ACService }`. The token is not exported from `@concepta/nestjs-access-control`; define it locally as `const ACCESS_CONTROL_MODULE_SETTINGS_TOKEN = 'ACCESS_CONTROL_MODULE_SETTINGS_TOKEN'` if needed.

6. **Add controller decorators**:
   - `@AccessControlReadMany({ resource: {name}Resource.many })`
   - `@AccessControlCreateOne({ resource: {name}Resource.one })`
   - etc. for each CRUD method

7. **Verify**: Run `yarn build` and `yarn test`

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 403 on all requests | Resource not in acRules | Add `acRules.grant()` |
| 403 for users only | Missing Own permissions | Add `createOwn`/`readOwn`/etc. |
| Access Query always denies | Default `return false` | Implement ownership check |
| Users see all resources | No ownership filtering | Implement `readOwn` in Access Query |
| Nest can't resolve the entity's repository (e.g. XEntityRepository) | Adapter uses `@InjectRepository(Entity)` but module has no `TypeOrmModule.forFeature` | Add `TypeOrmModule.forFeature([Entity])` to that module's imports |
| Nest can't resolve AccessControlGuard (AccessControlService) | Controller uses guard but module doesn't provide token + service | Add providers for `ACCESS_CONTROL_MODULE_SETTINGS_TOKEN` and `AccessControlService` (useClass: ACService) |

## Full Reference

`development-guides/ACCESS_CONTROL_GUIDE.md` — complete guide with code examples, role extraction, business logic patterns.
