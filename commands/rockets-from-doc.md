---
description: Implement a full project from a requirements document (PRD/spec/RFC). Coordinates planning, orchestrated CRUD generation, business logic, and validation — end to end.
---

# Rockets From Doc Command

Single command to go from spec to working project.

## Usage

```
/rockets-from-doc examples/PRD.md
/rockets-from-doc /path/to/spec.md
/rockets-from-doc docs/requirements.md into ./apps/api
```

## Execution Flow

### Step 1: Plan (rockets-planner agent)

Invoke the `rockets-planner` agent with the spec document. The planner:
1. Reads the spec and extracts entities, fields, relations, ACL, non-CRUD modules
2. Produces a **human-readable plan** (shown to user)
3. Writes **`.rockets/plan.json`** (machine-readable, for orchestrate.js)
4. **Waits for user approval** before proceeding

Do NOT duplicate planning logic here. The planner is the single owner of plan creation.

### Step 2: Bootstrap (if greenfield)

If no project exists at the target path:
```bash
node skills/rockets-project-bootstrap/scripts/bootstrap.js --dest <target>
```

Verify: `package.json` exists, `src/` directory present, dependencies installed, database accessible.

### Step 3: Generate (Team or Sequential)

If Agent Teams enabled AND plan has 3+ entities:
  → Form team per `CLAUDE.md` > Agent Teams section
  → Lead creates tasks with `blockedBy` from topological sort
  → Teammates self-claim and execute
  → All CRUD generation costs 0 tokens (pure scripts)

Otherwise (sequential fallback):
```bash
node skills/rockets-orchestrator/scripts/orchestrate.js \
  --project <project-path> \
  --spec .rockets/plan.json
```
  → Topological sort + wave-based execution (0 tokens)
  → Quality gates: stops on validation failure
  → Resume on failure: `orchestrate.js --project <path> --resume`

### Step 4: Business logic (non-CRUD)

For modules listed in `plan.json.nonCrud[]`:

**CRITICAL**: Non-CRUD services MUST NOT use `DataSource` or repositories directly (Rule 4).
Inject `CrudService`/`ModelService` from CRUD modules. For aggregation, use `getMany()` + in-memory processing.
Only exception: `DataSource.transaction()` for transaction boundaries (Rule 8).

1. Use `rockets-business-logic` skill or `rockets-custom-code` skill
2. Follow patterns from `development-guides/BUSINESS_LOGIC_PATTERNS_GUIDE.md`
3. State machines → Pattern 1 (status enums, transition maps, history entities)
4. Custom endpoints → Pattern 2 (approve, cancel, assign, complete)
5. Workflows → Pattern 3 (cross-entity orchestrations)
6. Event automation → Pattern 4 (listeners)
7. Notifications, file uploads, external APIs → Patterns 5-7

### Step 5: Validate + Report

```bash
# Structural + build validation
node skills/rockets-crud-generator/scripts/validate.js --project <path> --build

# Endpoint smoke test (optional but recommended)
node skills/rockets-runtime-diagnostics/scripts/smoke-test-endpoints.js --project <path>
```

### Step 6: Output report

Return:
1. Entities generated (from orchestrator output)
2. Non-CRUD modules implemented
3. Build status (pass/fail)
4. Smoke test results (if run)
5. Files created/changed
6. Open risks or follow-up tasks

## Token Economy

| Step | Tool | Tokens |
|------|------|--------|
| Plan | rockets-planner (opus) | ~15k |
| Bootstrap | script | 0 |
| CRUD generation | orchestrate.js (scripts) | 0 |
| Business logic | agent (sonnet) | ~10k/module |
| Validation | validate.js (script) | 0 |
| Smoke test | smoke-test-endpoints.js (script) | 0 |

## Pattern Gates

Enforced automatically by `validate.js` + `hooks/hooks.json`. See `CLAUDE.md` Mandatory Engineering Rules for the full list.

## References

- `agents/rockets-planner.md` — owns plan creation
- `skills/rockets-orchestrator/SKILL.md` — owns CRUD orchestration
- `skills/rockets-crud-generator/SKILL.md` — owns file generation
- `skills/rockets-business-logic/SKILL.md` — owns non-CRUD patterns
- `development-guides/ROCKETS_AI_INDEX.md` — guide routing
