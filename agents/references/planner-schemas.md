# Planner Schemas & Rules Reference

## Section A: plan.json Full Example

```json
{
  "entities": [
    {
      "entityName": "Category",
      "fields": [
        { "name": "name", "type": "string", "required": true, "maxLength": 100, "unique": true },
        { "name": "description", "type": "text", "required": false }
      ],
      "relations": [],
      "acl": {
        "admin": { "possession": "any", "operations": ["create", "read", "update", "delete"] },
        "user": { "possession": "any", "operations": ["read"] }
      }
    },
    {
      "entityName": "Task",
      "fields": [
        { "name": "title", "type": "string", "required": true, "maxLength": 200 },
        { "name": "description", "type": "text", "required": false },
        { "name": "status", "type": "enum", "enumValues": ["pending", "in_progress", "done"], "default": "pending" },
        { "name": "dueDate", "type": "date", "required": false }
      ],
      "relations": [
        { "name": "category", "type": "manyToOne", "targetEntity": "Category", "nullable": true },
        { "name": "user", "type": "manyToOne", "targetEntity": "User", "onDelete": "CASCADE" }
      ],
      "ownerField": "userId",
      "acl": {
        "admin": { "possession": "any", "operations": ["create", "read", "update", "delete"] },
        "user": { "possession": "own", "operations": ["create", "read", "update", "delete"] }
      }
    }
  ],
  "paths": {
    "entity": "src/entities",
    "module": "src/modules",
    "shared": "src/shared"
  },
  "nonCrud": [
    {
      "name": "Report",
      "type": "custom",
      "description": "Aggregation endpoints consuming Task and Category model services",
      "pattern": "business-logic"
    }
  ]
}
```

## Section B: sbvr-rules.json Full Schema

```json
{
  "version": 1,
  "specType": "sbvr",
  "spec": "docs/requirements.md",
  "extractedAt": "<ISO timestamp>",
  "rules": [
    {
      "id": "B1",
      "type": "state-machine",
      "description": "<specific, actionable description — what to enforce, which entity, what triggers it>",
      "entity": "Task",
      "pattern": 1,
      "technology": null,
      "edgeCases": [],
      "assumed": false,
      "status": "pending",
      "implementedAt": null,
      "files": []
    }
  ]
}
```

`specType`: `"sbvr"` | `"prd"` | `"rfc"` | `"custom"`

Optional fields added by the Gap Detection + Q&A phase:
- `technology` (string | null): Resolved technology/provider string (e.g., `"bullmq"`, `"sendgrid"`, `"s3"`). Set after Q&A.
- `edgeCases` (string[]): Edge case behaviors clarified during Q&A.
- `assumed` (boolean): `true` if the value was defaulted because the user skipped an OPTIONAL question.

Each rule's `description` must be implementation-actionable — not just the SBVR/PRD sentence. Include: what to enforce, which entity, what triggers it.

See `development-guides/SBVR_EXTRACTION_GUIDE.md` Section C for full type/pattern reference.

## Section C: plan.json Schema Rules

| Field | Required | Description |
|-------|----------|-------------|
| `entities[].entityName` | yes | PascalCase name (e.g., `"Task"`) |
| `entities[].fields[]` | yes | Array of field configs (see `rockets-crud-generator/SKILL.md`) |
| `entities[].relations[]` | no | Relations. `targetEntity` is base name WITHOUT `Entity` suffix |
| `entities[].acl` | no | Role → possession + operations. Omit for public entities |
| `entities[].ownerField` | no | Field for ownership check (default: `"userId"`) |
| `entities[].operations` | no | Subset of CRUD ops (default: all) |
| `entities[].isJunction` | no | `true` for many-to-many junction tables |
| `entities[].paths` | no | Per-entity path overrides |
| `paths` | no | Global paths (default: `src/entities`, `src/modules`, `src/shared`) |
| `nonCrud[]` | no | Modules that need manual implementation (not orchestrated) |

## Section D: Non-CRUD Service Rules

Non-CRUD modules (listed in `nonCrud[]`) MUST follow Rule 4 from `CLAUDE.md`:
- Inject model/CRUD services from other modules (e.g., `TaskCrudService`, `CategoryCrudService`)
- NEVER inject `DataSource`, repositories, or use `@InjectRepository` / `@InjectDynamicRepository`
- For aggregation, use `CrudService.getMany()` and aggregate in code (in-memory)
- Only exception: `DataSource.transaction()` for transaction boundaries (Rule 8)
- Include this constraint in the plan's non-CRUD module descriptions so implementing agents follow it

## Section E: Important Rules for plan.json

1. **Skip SDK-managed entities**: User, Role, UserRole, etc. are managed by `RocketsAuthModule`. Do NOT include them in `entities[]`. Only include entities that need NEW modules generated.
2. **Relations to SDK entities**: Use `targetEntity: "User"` — the generator handles it. But note: the related module won't exist as a standalone module, so `CrudRelations` wiring will need cleanup (documented in generator SKILL.md).
3. **Topological order is automatic**: `orchestrate.js` does topological sorting. You don't need to order entities manually.
4. **Non-CRUD goes in `nonCrud[]`**: Report modules, dashboards, aggregation endpoints — these are NOT generated by the orchestrator. List them so the agent knows to implement them separately after orchestration.
5. **Field types**: `string`, `text`, `number`, `float`, `boolean`, `date`, `uuid`, `json`, `enum`. Use `enumValues` for enum type.
