# SBVR EXTRACTION GUIDE

> **For AI Tools**: Use this guide to parse SBVR specifications and classify every rule into actionable implementation categories. After extraction, every behavioral rule must map to a pattern from `BUSINESS_LOGIC_PATTERNS_GUIDE.md`.

## A. Rule Classification Matrix

| SBVR Language Pattern | Category | Maps to Pattern | Implementation |
|---|---|---|---|
| "X has status: one of {A, B, C}" | Status Enum | Pattern 1 | `{entity}-status.constants.ts` enum |
| "transition from A to B only when condition" | State Transition | Pattern 1 | `{entity}-status.service.ts` transition map |
| "It is obligatory that system [verb] when [event]" | Automation | Pattern 4 | `{module}.listener.ts` event handler |
| "It is prohibited that [role] [verb] unless [condition]" | Validation Rule | — | Guard logic in model service |
| "file must be format X, not exceed Y MB" | File Constraint | Pattern 6 | `{entity}-upload.service.ts` validation |
| "system sends email/notification when..." | Notification | Pattern 5 | `notification.service.ts` + template |
| "system queries/retrieves from API X" | Integration | Pattern 7 | `{provider}-http.service.ts` |
| "admin can [non-CRUD-verb] a [noun]" | Custom Endpoint | Pattern 2 | Action method in controller + model service |
| "check if exists locally, create if not" | Dedup/Sync | Pattern 8 | `syncFromApi()` in model service |
| "registration involves creating X, Y, Z" | Multi-Entity Op | Pattern 9 | `DataSource.transaction()` in workflow |
| "System runs X every night / on schedule" | Background Job | Pattern 11 | `{entity}-scheduler.service.ts` |
| "System sends HTTP callback to [URL] when [event]" | Outbound Webhook | Pattern 12 | `{context}-webhook.service.ts` |
| "each [entity] has exactly one [field]" | Definitional | — | Entity column + validation decorator |
| "It is impossible that [condition]" | Constraint | — | Unique index or model service guard |
| "[role] manages/creates [entity]" | Relationship | — | ACL rule + entity FK |
| "[entity] belongs to / contains [entity]" | Relationship | — | TypeORM relation (`@ManyToOne`, `@OneToMany`) |
| "ordered / sequential starting from 1" | Ordering | — | Integer column + model service logic |
| "display = UTC + offset" | Derivation | — | Computed at API response layer |

## B. Extraction Process

After reading an SBVR spec, produce the following structured output:

### Step 1: Count and List Entities

```
Entities: X total
- EntityA (Part 1.x reference)
- EntityB (Part 1.x reference)
...
```

### Step 2: Count and List Roles

```
Roles: X total
- RoleA (permissions summary)
- RoleB (permissions summary)
```

### Step 3: Identify State Machines

For each entity with a status enum:

```
State Machine: {Entity}
  States: [State1, State2, State3, State4]
  Transitions:
    State1 -> State2 (condition from ST rule)
    State2 -> State3 (condition from ST rule)
    State3 -> State4 (condition from ST rule)
  Terminal: State4 (no outbound transitions)
  Rules: ST1, ST2, ST3, ST4, B7, B8
```

### Step 4: Identify Custom Endpoints

```
Custom Endpoints:
- POST /{entities}/:id/{action} — B-rule reference, role restriction
- POST /{entities}/:id/{action} — B-rule reference, role restriction
```

### Step 5: Identify Automation Rules

```
Automation (event-driven):
- When {event}: {action} — B-rule reference
- When {event}: {action} — B-rule reference
```

### Step 6: Identify Validation Rules

```
Validation Rules:
- {Entity}.{field}: {constraint} — D-rule or B-rule reference
- {Entity}: {business constraint} — B-rule reference
```

### Step 7: Identify File Upload Specs

```
File Uploads:
- {FileType}: format={format}, maxSize={size}, role={role} — B-rule references
```

### Step 8: Identify Notification Triggers

```
Notifications:
- When {event}: email to {recipient} — B-rule reference
- When {event}: email to {recipient} — B-rule reference
```

### Step 9: Identify API Integrations

```
API Integrations:
- {Provider}: {what data}, priority={N} — B-rule references
```

### Step 10: Identify Orchestration Workflows

```
Workflows:
- {WorkflowName}: {Entity1} -> {Entity2} -> {Entity3} — B-rule references
```

## C. Coverage Registry (Machine-Readable)

### C1. When to Write `.rockets/sbvr-rules.json`

The planner writes this file alongside `plan.json` when the source document is any spec type (SBVR, PRD, RFC, or custom requirements). It tracks only rules that require **code implementation beyond CRUD** — not entity definitions or simple constraints.

### C2. Schema

```json
{
  "version": 1,
  "specType": "sbvr",
  "spec": "docs/requirements.md",
  "extractedAt": "2026-03-02T10:00:00Z",
  "rules": [
    {
      "id": "B1",
      "type": "state-machine",
      "description": "Task has status: pending → in_progress → done → cancelled. Transitions: pending→in_progress (assignee set), in_progress→done (all subtasks done), any→cancelled (admin only).",
      "entity": "Task",
      "pattern": 1,
      "status": "pending",
      "implementedAt": null,
      "files": []
    }
  ]
}
```

**`specType`** values: `"sbvr"` | `"prd"` | `"rfc"` | `"custom"`

**`type`** values and their pattern numbers:

| type | Pattern | Maps to |
|------|---------|---------|
| `state-machine` | 1 | `{entity}-status.service.ts` + transition map |
| `custom-endpoint` | 2 | Action method in controller + model service |
| `orchestration` | 3 | `{workflow}-workflow.service.ts` |
| `automation` | 4 | `{module}.listener.ts` event handler |
| `notification` | 5 | Notification service + audit record |
| `file-upload` | 6 | `{entity}-upload.service.ts` |
| `api-integration` | 7 | `{provider}-http.service.ts` |
| `dedup-sync` | 8 | `syncFromApi()` in model service |
| `transaction` | 9 | `DataSource.transaction()` in workflow |
| `background-job` | 11 | `{entity}-scheduler.service.ts` or `{entity}-{action}.processor.ts` |
| `outbound-webhook` | 12 | `{context}-webhook.service.ts` + `webhook-delivery` module |
| `validation` | — | Guard logic in model service |
| `derived-field` | — | Computed at API response layer |

**Include** (requires implementation beyond CRUD):
- State machines & transitions (status enums + enforced transition maps)
- Automation triggers (event-driven side effects)
- Notifications
- Custom non-CRUD endpoints (approve, cancel, assign, etc.)
- File upload constraints
- External API integrations
- Dedup/sync logic
- Transaction workflows
- Validation guards (model service guards, not DTO constraints)
- Derived field computations
- Background jobs (cron/queue processing)
- Outbound webhooks (HTTP callbacks with delivery audit)

**Do NOT include**:
- Definitional rules (entity columns) → in `plan.json` fields
- Relationship rules (FK, TypeORM relations) → in `plan.json` relations
- Simple uniqueness constraints → entity column decorator
- DTO-level validation (class-validator decorators)

### C3. `check-sbvr-coverage.js` Usage

```bash
# Coverage report (human-readable)
node skills/rockets-orchestrator/scripts/check-sbvr-coverage.js --project ./apps/api

# Pending rules as JSON array (for automation loop)
node skills/rockets-orchestrator/scripts/check-sbvr-coverage.js --project ./apps/api --pending

# Mark a rule as implemented
node skills/rockets-orchestrator/scripts/check-sbvr-coverage.js --project ./apps/api \
  --mark-implemented B7 \
  --files "src/modules/order/order-notification.service.ts,src/modules/order/listeners/order-shipped.listener.ts"
```

### C4. PRD / RFC Extraction

For PRD or RFC documents, apply the same extraction process (Section B) but adapted to the document's language:
- User stories → identify the behavioral rule ("As a buyer, I receive an email when my order ships" → `notification`, Pattern 5)
- Acceptance criteria → identify validation and state rules
- "System automatically..." → `automation`, Pattern 4
- "Admin can [non-CRUD verb]..." → `custom-endpoint`, Pattern 2

Use `"specType": "prd"` or `"specType": "rfc"` in the registry file.

## D. Coverage Report Template

After implementation, produce this report:

```
## SBVR Coverage Report

### Definitional Rules (Part 3.1)
| Rule | Description | Status | Implementation |
|------|------------|--------|----------------|
| D1 | User has unique email | Done | Entity unique constraint |
| D2 | User has exactly one role | Done | Enum column + validation |
...

### Behavioral Rules (Part 3.3)
| Rule | Description | Status | Pattern | Implementation |
|------|------------|--------|---------|----------------|
| B1 | 2FA required | Done | — | Auth guard (SDK) |
| B5 | ISRC required on create | Done | — | DTO validation |
| B6 | Metadata enrichment on ISRC | Done | P4+P7+P8 | IsrcEnteredListener + providers |
| B7 | No backward from Available for Sale | Done | P1 | Status transition map |
...

### State Transitions (Part 4)
| Rule | Description | Status | Implementation |
|------|------------|--------|----------------|
| ST1 | New -> Creation Process | Done | SongStatusService |
| ST2 | Creation Process -> Ready for Review | Done | SongStatusService |
...

### Summary
- Definitional rules: X/Y implemented (Z%)
- Behavioral rules: X/Y implemented (Z%)
- State transitions: X/Y implemented (Z%)
- **Total: X/Y rules implemented (Z%)**
```

## E. Common SBVR Parsing Pitfalls

1. **Conflating entities with roles**: "Admin creates Song" is an ACL rule, not a new entity.
2. **Missing implied state machines**: If an entity has a `status` field with enumerated values, it has a state machine even if no explicit ST rules exist.
3. **Overlooking automation triggers**: "System does X when Y" rules are often buried in workflow descriptions (Part 5+), not just Part 3.
4. **Ignoring file upload rules**: File format/size constraints in "Data Quality" sections map to upload validation.
5. **Treating API sync as CRUD**: External API providers + dedup logic are Patterns 7+8, not standard entity CRUD.

## F. Related Guides

- [BUSINESS_LOGIC_PATTERNS_GUIDE.md](./BUSINESS_LOGIC_PATTERNS_GUIDE.md) — Pattern implementations
- [CRUD_PATTERNS_GUIDE.md](./CRUD_PATTERNS_GUIDE.md) — Entity CRUD (generate first)
- [ACCESS_CONTROL_GUIDE.md](./ACCESS_CONTROL_GUIDE.md) — Role-based rules
