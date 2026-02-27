---
name: rockets-crud-generator
description: Generate complete Rockets SDK CRUD modules with TypeORM entities, NestJS modules, controllers, services, DTOs, and interfaces. Use when creating new entities, domain objects, or junction tables for many-to-many relationships.
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

| Script | Purpose | Tokens |
|--------|---------|--------|
| `generate.js` | Generate all files as JSON output | 0 |
| `integrate.js` | Write files + wire into project (entities, modules, ACL, queryServices) | 0 |
| `validate.js` | Post-generation checks (structure, build, ACL) | 0 |

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

### Field Configuration

```typescript
interface FieldConfig {
  name: string;
  type: 'string' | 'text' | 'number' | 'float' | 'boolean' | 'date' | 'uuid' | 'json' | 'enum';
  required?: boolean;           // Default: true
  unique?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  precision?: number;           // For float
  scale?: number;               // For float
  default?: any;
  enumValues?: string[];        // Required for enum type
  apiDescription?: string;
  apiExample?: any;
  creatable?: boolean;          // Include in CreateDto (default: true)
  updatable?: boolean;          // Include in UpdateDto (default: true)
}
```

### Relation Configuration

```typescript
interface RelationConfig {
  name: string;
  type: 'manyToOne' | 'oneToMany' | 'oneToOne';
  targetEntity: string;         // Base name WITHOUT "Entity" suffix (e.g., "User" not "UserEntity")
  foreignKey?: string;          // Default: targetCamelId
  joinType?: 'LEFT' | 'INNER';
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  nullable?: boolean;
}
```

> **Important**: `targetEntity` must be the base entity name (e.g., `"User"`, `"Category"`).
> The generator appends `Entity` automatically. If you pass `"UserEntity"`, the suffix is
> stripped to prevent double-suffixing (`UserEntityEntity`).

### ACL Configuration

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

## Examples

### Basic Entity

```json
{
  "entityName": "Tag",
  "fields": [
    { "name": "name", "type": "string", "required": true, "maxLength": 50, "unique": true },
    { "name": "color", "type": "string", "maxLength": 7, "apiExample": "#FF5733" }
  ]
}
```

### With ACL + Custom Paths (monorepo)

```json
{
  "entityName": "Product",
  "paths": {
    "entity": "apps/api/src/entities",
    "module": "apps/api/src/modules",
    "shared": "packages/shared/src"
  },
  "ownerField": "createdById",
  "acl": {
    "admin": { "possession": "any", "operations": ["create","read","update","delete"] },
    "user": { "possession": "own", "operations": ["create","read","update","delete"] }
  },
  "fields": [
    { "name": "name", "type": "string", "required": true },
    { "name": "price", "type": "float", "precision": 10, "scale": 2 }
  ]
}
```

### Junction Table

```json
{
  "entityName": "ProductTag",
  "tableName": "product_tag",
  "isJunction": true,
  "fields": [],
  "relations": [
    { "name": "product", "type": "manyToOne", "targetEntity": "Product", "onDelete": "CASCADE" },
    { "name": "tag", "type": "manyToOne", "targetEntity": "Tag", "onDelete": "CASCADE" }
  ],
  "operations": ["readMany", "readOne", "createOne", "deleteOne"]
}
```

## Generated Files

For a given entity (e.g. `Product`) with default paths:

```
src/
├── entities/
│   └── {entity}.entity.ts
├── modules/{entity}/
│   ├── constants/{entity}.constants.ts
│   ├── {entity}.module.ts
│   ├── {entity}.crud.controller.ts
│   ├── {entity}.crud.service.ts
│   ├── {entity}-typeorm-crud.adapter.ts
│   └── {entity}-access-query.service.ts
└── shared/{entity}/          (if paths.shared is set)
    ├── dtos/
    │   ├── {entity}.dto.ts
    │   ├── {entity}-create.dto.ts
    │   ├── {entity}-update.dto.ts
    │   └── {entity}-paginated.dto.ts
    ├── interfaces/
    │   ├── {entity}.interface.ts
    │   ├── {entity}-creatable.interface.ts
    │   └── {entity}-updatable.interface.ts
    └── index.ts
```

## AccessControl Integration (queryServices pattern)

The generator produces controllers with full ACL decorators (`@UseGuards(AccessControlGuard)`, `@AccessControlQuery`, `@AccessControlReadMany`, etc.). These work correctly when the access query service is registered via `queryServices` in `AccessControlModule.forRoot()`.

### How it works

1. **Generator** creates the access query service with `@InjectDynamicRepository` (database-agnostic)
2. **integrate.js** registers the service in `queryServices` of the AccessControlModule config
3. The `AccessControlGuard` resolves the service from its own scope (no hack needed)

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
      // Ownership check via dynamic repository (database-agnostic)
      const entity = await this.taskRepo.findOne({ where: { id: entityId } });
      return entity?.userId === user.id;
    }
    return false;
  }
}
```

### Required wiring in app.module.ts

```typescript
// AccessControlModule config (or via RocketsAuthModule):
accessControl: {
  settings: { rules: acRules },
  queryServices: [TaskAccessQueryService, CategoryAccessQueryService],
}
```

The `integrate.js` script handles this automatically.

## integrate.js — Auto-wiring

Takes the JSON output from `generate.js` and wires everything:

```bash
node generate.js '{ ... }' | node integrate.js --project ./apps/api
```

What it does:
1. Writes all generated files to disk
2. Adds entity export to `entities/index.ts`
3. Adds entity to `typeorm.settings.ts` entities array
4. Adds module import to `app.module.ts`
5. Adds resource + grants to `app.acl.ts` (if `acl` config present)
6. Adds access query service to `queryServices` in AccessControlModule config

## validate.js — Post-generation Checks

Validates project structure and patterns after generation:

```bash
node validate.js --project ./apps/api           # Static checks only
node validate.js --project ./apps/api --build   # Static checks + TypeScript build
```

### Generated Code Checks
1. `@InjectRepository` only in `*-typeorm-crud.adapter.ts`
2. All entities exported in `entities/index.ts`
3. All modules imported in `app.module.ts`
4. ACL resources defined in `app.acl.ts`
5. Access query services registered in feature module providers
6. No ACL workaround providers in feature modules
7. ACL own-scope entities have matching `ownerField` column in entity
8. `CrudModule.forRoot({})` present when `CrudModule.forFeature()` is used

### Template Integrity Checks (safety nets — should never fire on a correct template)
9. No imports from internal `dist/` paths
10. No stale template placeholder strings (Music Management, PetAccessQueryService, etc.)
11. All entity tables have corresponding migrations (severity: **error**)
12. No SQLite base classes (`*SqliteEntity`) in a Postgres project

Output: `{ passed: boolean, issues: [{ severity, rule, message, file, line }] }`

## Known Limitations — Relations

The generator produces `CrudRelations` decorators and `CrudRelationRegistry` providers for modules with relations. These reference the related module's CRUD service (e.g., `UserCrudService`), which **must exist as an importable module**. If the related entity is managed by the SDK (e.g., User from `RocketsAuthModule`) rather than by a standalone module you wrote, the generated relation wiring will fail.

**Workaround for SDK-managed entities**: Remove the `CrudRelations` decorator, the `CrudRelationRegistry` provider, and all references to non-existent related modules/services. Instead, rely on TypeORM `@ManyToOne`/`@JoinColumn` decorators on the entity and include the FK column (`userId`, `categoryId`) directly in the DTO. The CRUD endpoints will accept and persist the FK; TypeORM handles the join at query time.

## Post-Generation (manual steps if not using integrate.js)

1. Export entity from entities index
2. Import module in app.module.ts
3. Add entity to typeorm.settings.ts
4. Register access query service in `queryServices` of AccessControlModule config
5. Add resource + grants to app.acl.ts (if using ACL)
6. Remove CrudRelations if related entity is SDK-managed (see above)
7. Export from shared index (if using shared package)
