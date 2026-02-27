---
description: Generate a complete Rockets SDK module with the 12-file pattern. Creates entity, interfaces, DTOs, adapter, services, controller, and module files. Auto-integrates into project and validates.
---

# Rockets Module Command

Invokes the **rockets-module-generator** agent to create a complete feature module using the `rockets-crud-generator` skill.

## What This Command Does

1. **Gather requirements** — entity name, fields, relations, operations, ACL
2. **Generate all files** via `generate.js` (0 tokens — script-based)
3. **Integrate into project** via `integrate.js` — writes files, wires entities, modules, ACL, queryServices
4. **Validate** via `validate.js` — structural checks + optional build
5. **Report** — files created, actions taken, any warnings

## Source of Truth

- `CLAUDE.md`
- `development-guides/CRUD_PATTERNS_GUIDE.md`
- `development-guides/DTO_PATTERNS_GUIDE.md`
- `skills/rockets-crud-generator/SKILL.md`

## Usage

```
# Basic
/rockets-module Product

# With fields
/rockets-module Product with fields: name (string), price (float), categoryId (uuid relation to Category)

# With ACL
/rockets-module Product with ACL: admin=any, user=own

# Into specific project
/rockets-module Product into ./apps/api
```

## Workflow

```
1. Parse user input → build JSON config
2. node generate.js '<config-json>'     → JSON output (files + wiring)
3. node integrate.js --input <output> --project <path>  → auto-wire
4. node validate.js --project <path>    → structural checks
5. Report results to user
```

### Brownfield (existing project)

When adding a module to an existing project:
- `integrate.js` detects existing entities/modules and warns (no overwrite)
- `validate.js` checks the new module doesn't conflict with existing ones
- ACL resources and queryServices are appended, not replaced

### Greenfield (new project)

For new projects, use `/rockets-from-doc` instead — it bootstraps the project first and then orchestrates all module generation.

## What Gets Created

```
src/
├── entities/{entity}.entity.ts
├── modules/{entity}/
│   ├── constants/{entity}.constants.ts
│   ├── {entity}.module.ts
│   ├── {entity}.crud.controller.ts
│   ├── {entity}.crud.service.ts
│   ├── {entity}-typeorm-crud.adapter.ts
│   └── {entity}-access-query.service.ts
└── shared/{entity}/          (if paths.shared is set)
    ├── interfaces/
    │   ├── {entity}.interface.ts
    │   ├── {entity}-creatable.interface.ts
    │   └── {entity}-updatable.interface.ts
    ├── dtos/
    │   ├── {entity}.dto.ts
    │   ├── {entity}-create.dto.ts
    │   ├── {entity}-update.dto.ts
    │   └── {entity}-paginated.dto.ts
    └── index.ts
```

## What Gets Auto-Wired

1. Entity exported in `entities/index.ts`
2. Entity added to `typeorm.settings.ts`
3. Module imported in `app.module.ts`
4. ACL resource + grants added to `app.acl.ts` (if ACL configured)
5. Access query service added to `queryServices` in AccessControlModule config

## Implementation

This command uses the `rockets-crud-generator` skill internally. The generator is the mandatory path for all module creation — no manual copy-paste from guides.
