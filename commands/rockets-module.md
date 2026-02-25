---
description: Generate a complete Rockets SDK module with the 12-file pattern. Creates entity, interfaces, DTOs, adapter, services, controller, and module files. Also updates ACL and app.module.
---

# Rockets Module Command

Invokes the **rockets-module-generator** agent to create a complete feature module.

## What This Command Does

1. **Gather requirements** — entity name, fields, relations, operations
2. **Generate all 12 files** in the correct order
3. **Update ACL** — add resource to `AppResource` and rules to `acRules`
4. **Register module** in `app.module.ts`
5. **Verify** — run build to confirm everything compiles

## Source of Truth

- `CLAUDE.md`
- `development-guides/CRUD_PATTERNS_GUIDE.md`
- `development-guides/DTO_PATTERNS_GUIDE.md`

## Usage

```
/rockets-module Product
/rockets-module Product with fields: name (string), price (float), tagId (uuid relation to Tag)
```

## What Gets Created

```
src/
├── entities/product.entity.ts
├── modules/product/
│   ├── constants/product.constants.ts
│   ├── product.module.ts
│   ├── product.crud.controller.ts
│   ├── product.crud.service.ts
│   ├── product-typeorm-crud.adapter.ts
│   ├── product-access-query.service.ts
│   └── index.ts
└── shared/product/
    ├── interfaces/
    │   ├── product.interface.ts
    │   ├── product-creatable.interface.ts
    │   └── product-updatable.interface.ts
    ├── dtos/
    │   ├── product.dto.ts
    │   ├── product-create.dto.ts
    │   ├── product-update.dto.ts
    │   └── product-paginated.dto.ts
    └── index.ts
```

## Implementation

This command uses the `rockets-crud-generator` skill internally. The generator is the mandatory path for all module creation — no manual copy-paste from guides.
