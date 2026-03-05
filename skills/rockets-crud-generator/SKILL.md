---
name: rockets-crud-generator
description: Generate complete Rockets SDK CRUD modules with TypeORM entities, NestJS modules, controllers, services, DTOs, and interfaces. Use when creating new entities, domain objects, or junction tables for many-to-many relationships.
argument-hint: '[entity-config-json]'
---

# Rockets SDK CRUD Generator

Generate complete CRUD modules following Rockets SDK patterns with TypeORM, NestJS, and proper DTOs/interfaces.

## Quick Start

```bash
# Generate files (outputs JSON)
node crud-generator/scripts/generate.js '{ "entityName": "Product", "fields": [...] }'

# Generate + integrate into project
node crud-generator/scripts/generate.js '{ ... }' | node crud-generator/scripts/integrate.js --project ./apps/api

# Validate after generation
node crud-generator/scripts/validate.js --project ./apps/api --build
```

## Scripts

| Script | Purpose |
|--------|---------|
| `generate.js` | Generate all files as JSON output |
| `integrate.js` | Write files + wire into project (entities, modules, ACL, queryServices) |
| `validate.js` | Post-generation checks (structure, build, ACL) |

## Configuration

```typescript
interface Config {
  // Required
  entityName: string;           // PascalCase entity name

  // Optional naming
  pluralName?: string;          // API path plural (auto-pluralized)
  tableName?: string;           // Database table (snake_case)

  // Output paths (configurable per project)
  paths?: {
    entity?: string;            // Default: "src/entities"
    module?: string;            // Default: "src/modules"
    shared?: string;            // Default: "src/shared" (set to null to skip)
  };

  // Shared package import path for generated code
  sharedPackage?: string;       // e.g., "@my-org/shared" (default: relative import)

  // Fields & Relations
  fields: FieldConfig[];
  relations?: RelationConfig[];

  // Operations (default: all)
  operations?: ('readMany' | 'readOne' | 'createOne' | 'updateOne' | 'deleteOne' | 'recoverOne')[];

  // ACL (access control)
  acl?: Record<string, { possession: 'own' | 'any'; operations: ('create'|'read'|'update'|'delete')[] }>;
  ownerField?: string;          // Field for ownership check (default: "userId")

  // Options
  generateModelService?: boolean;
  isJunction?: boolean;
}
```

> Full `FieldConfig` and `RelationConfig` interfaces: [references/config-schema.md](references/config-schema.md)

## ACL Configuration

```json
{
  "entityName": "Task",
  "ownerField": "userId",
  "acl": {
    "admin": { "possession": "any", "operations": ["create","read","update","delete"] },
    "user": { "possession": "own", "operations": ["create","read","update","delete"] }
  }
}
```

When `acl` is provided:
- Access query service uses `@InjectDynamicRepository` for ownership checks
- Generator outputs wiring snippets for `app.acl.ts` (resource enum + grants)
- Generator outputs wiring for `queryServices` in AccessControlModule

> More examples (Basic Entity, monorepo paths, Junction Table): [references/config-schema.md](references/config-schema.md)

## AccessControl Integration (queryServices pattern)

The generator produces controllers with full ACL decorators (`@UseGuards(AccessControlGuard)`, `@AccessControlQuery`, `@AccessControlReadMany`, etc.). These work correctly when the access query service is registered via `queryServices` in `AccessControlModule.forRoot()`.

### Access Query Service pattern

```typescript
@Injectable()
export class TaskAccessQueryService implements CanAccess {
  constructor(
    @InjectDynamicRepository(TASK_MODULE_TASK_ENTITY_KEY)
    private taskRepo: RepositoryInterface<TaskEntity>,
  ) {}

  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const query = context.getQuery();
    if (query.possession === 'any') return true;
    if (query.possession === 'own') {
      const entity = await this.taskRepo.findOne({ where: { id: entityId } });
      return entity?.userId === user.id;
    }
    return false;
  }
}
```

### Required wiring in app.module.ts

```typescript
accessControl: {
  settings: { rules: acRules },
  queryServices: [TaskAccessQueryService, CategoryAccessQueryService],
}
```

The `integrate.js` script handles this automatically.

## integrate.js — Auto-wiring

```bash
node generate.js '{ ... }' | node integrate.js --project ./apps/api
```

What it does:
1. Writes all generated files to disk
2. Adds entity to `typeorm.settings.ts` entities array
3. Adds module import to `app.module.ts`
4. Adds resource + grants to `app.acl.ts` (if `acl` config present)
5. Adds access query service to `queryServices` in AccessControlModule config

## validate.js — Post-generation Checks

```bash
node validate.js --project ./apps/api           # Static checks only
node validate.js --project ./apps/api --build   # Static checks + TypeScript build
```

### Checks performed
1. `@InjectRepository` only in `*-typeorm-crud.adapter.ts`
2. All modules imported in `app.module.ts`
3. ACL resources defined in `app.acl.ts`
4. Access query services registered in feature module providers
5. No ACL workaround providers in feature modules
6. ACL own-scope entities have matching `ownerField` column
7. `CrudModule.forRoot({})` present when `CrudModule.forFeature()` is used
8. No imports from internal `dist/` paths
9. No stale template placeholder strings
10. All entity tables have corresponding migrations (severity: **error**)
11. No SQLite base classes in a Postgres project

Output: `{ passed: boolean, issues: [{ severity, rule, message, file, line }] }`

---

> Generated files tree, Known Limitations, and Post-Generation manual steps: [references/config-schema.md](references/config-schema.md)
