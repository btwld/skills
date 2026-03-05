# CRUD Generator — Full Config Schema & Examples

## FieldConfig

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

## RelationConfig

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
├── modules/{entity}/
│   ├── entities/{entity}.entity.ts
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

## Known Limitations — Relations

The generator produces `CrudRelations` decorators and `CrudRelationRegistry` providers for modules with relations. These reference the related module's CRUD service (e.g., `UserCrudService`), which **must exist as an importable module**. If the related entity is managed by the SDK (e.g., User from `RocketsAuthModule`) rather than by a standalone module you wrote, the generated relation wiring will fail.

**Workaround for SDK-managed entities**: Remove the `CrudRelations` decorator, the `CrudRelationRegistry` provider, and all references to non-existent related modules/services. Instead, rely on TypeORM `@ManyToOne`/`@JoinColumn` decorators on the entity and include the FK column (`userId`, `categoryId`) directly in the DTO. The CRUD endpoints will accept and persist the FK; TypeORM handles the join at query time.

## Post-Generation (manual steps if not using integrate.js)

1. Import module in `app.module.ts`
2. Add entity to `typeorm.settings.ts`
3. Register access query service in `queryServices` of AccessControlModule config
4. Add resource + grants to `app.acl.ts` (if using ACL)
5. Remove CrudRelations if related entity is SDK-managed (see Known Limitations above)
6. Export from shared index (if using shared package)
