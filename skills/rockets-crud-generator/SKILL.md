---
name: rockets-crud-generator
description: Generate complete Rockets SDK CRUD modules with TypeORM entities, NestJS modules, controllers, services, DTOs, and interfaces. Use when creating new entities, domain objects, or junction tables for many-to-many relationships.
---

# Rockets SDK CRUD Generator

Generate complete CRUD modules following Rockets SDK patterns with TypeORM, NestJS, and proper DTOs/interfaces.

## Quick Start

```bash
node crud-generator/scripts/generate.js '{
  "entityName": "Product",
  "fields": [
    { "name": "name", "type": "string", "required": true, "maxLength": 100 }
  ]
}'
```

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

### With Custom Paths (monorepo)

```json
{
  "entityName": "Product",
  "paths": {
    "entity": "apps/api/src/entities",
    "module": "apps/api/src/modules",
    "shared": "packages/shared/src"
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

### Skip Shared Package

```json
{
  "entityName": "InternalLog",
  "paths": {
    "shared": null
  },
  "fields": [
    { "name": "message", "type": "text" }
  ]
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

## Generated module wiring (avoids common runtime errors)

The generator now produces modules that work out of the box with Nest and Concepta access control:

- **TypeOrmModule.forFeature([Entity])** — The adapter uses `@InjectRepository(Entity)`; Nest resolves that only when the entity is registered via `TypeOrmModule.forFeature`. The generated module includes this so the adapter gets the repository.
- **AccessControlGuard dependencies** — The generated controller uses `@UseGuards(AccessControlGuard)`. The guard is resolved in the controller's module and needs `ACCESS_CONTROL_MODULE_SETTINGS_TOKEN` and `AccessControlService`. The generated module provides both (using `acRules` from `app.acl` and `ACService` from `access-control.service`). The token is not exported from the package, so the generator uses the string literal.
- **Access Query Service** — Generated stub is fail-secure (default deny), uses `query.possession`, and documents that entity id must come from `context.getRequest()?.params?.id` (not `query.subjectId`, which is not on `IQueryInfo`). Note: `context.getUser()` and `context.getRequest()` return `unknown` — add type assertions (e.g., `context.getUser() as { id?: string } | undefined`).

**Requirement**: Project must have `src/app.acl.ts` and `src/access-control.service.ts` (or equivalent) when using the default module template; otherwise remove the guard providers or adjust import paths.

## Known Limitations — Relations

The generator produces `CrudRelations` decorators and `CrudRelationRegistry` providers for modules with relations. These reference the related module's CRUD service (e.g., `UserCrudService`), which **must exist as an importable module**. If the related entity is managed by the SDK (e.g., User from `RocketsAuthModule`) rather than by a standalone module you wrote, the generated relation wiring will fail.

**Workaround for SDK-managed entities**: Remove the `CrudRelations` decorator, the `CrudRelationRegistry` provider, and all references to non-existent related modules/services. Instead, rely on TypeORM `@ManyToOne`/`@JoinColumn` decorators on the entity and include the FK column (`userId`, `categoryId`) directly in the DTO. The CRUD endpoints will accept and persist the FK; TypeORM handles the join at query time.

## Known Limitations — AccessControl Decorators (CRITICAL)

The generator produces `@UseGuards(AccessControlGuard)`, `@AccessControlQuery({ service: ... })`, and `@AccessControlReadMany/CreateOne/etc` decorators. **These DO NOT WORK in feature modules.** The `AccessControlGuard` uses `ModuleRef.resolve()` which cannot resolve services from feature modules — it silently returns 403 Forbidden with no error log.

**Required cleanup after generation:**
1. Remove `@UseGuards(AccessControlGuard)` from controller
2. Remove `@AccessControlQuery(...)` from controller
3. Remove all `@AccessControlReadMany`, `@AccessControlCreateOne`, etc. decorators from methods
4. Remove `AccessControlGuard`, `AccessControlQuery`, and all `AccessControl*` imports from controller
5. Remove `{ provide: 'ACCESS_CONTROL_MODULE_SETTINGS_TOKEN', ... }` from module providers
6. Remove `{ provide: AccessControlService, useClass: ACService }` from module providers
7. Remove `*AccessQueryService` from module providers
8. Keep only `@Crud*` decorators — the global JWT guard handles authentication

## Post-Generation

1. Export entity from entities index
2. Import module in app.module.ts
3. **Remove AccessControl decorators and providers** (see above)
4. Remove CrudRelations if related entity is SDK-managed (see above)
5. Export from shared index (if using shared package)
