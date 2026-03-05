---
name: rockets-from-doc
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

**Step 1b: Gap Detection + Q&A**

The planner automatically detects missing specifications and asks clarifying questions BEFORE finalizing the plan. This loop continues until no gaps remain (max 2 rounds):

1. Planner identifies gaps (unspecified technology, ambiguous rules, missing edge cases)
2. Planner asks ALL questions in ONE structured message (see `development-guides/SPEC_GAP_QUESTIONS.md`)
3. Human answers
4. Planner incorporates answers into plan.json + sbvr-rules.json
5. If answers reveal new gaps: one more Q&A round (max)
6. Planner writes final plan.json + sbvr-rules.json + presents human-readable plan for approval

**Never skip this step.** An unanswered technology choice defaults to the simplest option (cron over bull, nodemailer over SendGrid) — but the planner MUST declare which default it used.

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

### Step 3b: Database Migrations

After CRUD generation, generate and run TypeORM migrations:

```bash
# Ensure src/data-source.ts exists (see rockets-migration skill)
npm run typeorm migration:generate -- src/migrations/InitialSchema
npm run typeorm migration:run
```

If `typeorm` script missing from `package.json`, add it first (see `skills/rockets-migration/SKILL.md`).

On failure: check `src/data-source.ts` entity glob matches generated entity paths.

### Step 3c: Seeders

After migrations, run seeders to populate initial data:

```bash
npm run seed
```

If seeder script doesn't exist: use `skills/rockets-seeder/SKILL.md` to create it first.

Seeders must create:
- All roles defined in the spec
- Admin user (credentials from env vars or plan.json seeder config)
- Any lookup/reference data required for the app to function

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

### Step 4b: Business Logic Coverage Loop

If `.rockets/sbvr-rules.json` does not exist (non-SBVR/PRD spec or no behavioral rules extracted): skip to Step 5.

**LOOP — repeat until no pending rules remain:**

**1. Get pending rules:**
```bash
node skills/rockets-orchestrator/scripts/check-sbvr-coverage.js \
  --project <path> --pending
```
Parse output as JSON array. If empty array (`[]`): break loop, go to Step 5.

**2. Take the FIRST rule in the array.**
Announce: `"Implementing [id]: [description] (Pattern [pattern])"`

**3. Implement the rule** using the `rockets-business-logic` skill:
- Read: `rule.type`, `rule.description`, `rule.entity`, `rule.pattern`
- Follow the checklist for Pattern `[pattern]` in the skill
- Collect all files created or modified

**4. Mark as implemented:**
```bash
node skills/rockets-orchestrator/scripts/check-sbvr-coverage.js \
  --project <path> \
  --mark-implemented [rule.id] \
  --files "[comma-separated file paths]"
```
Do NOT mark until code is written and compiles.

**5. Validate structure:**
```bash
node skills/rockets-crud-generator/scripts/validate.js --project <path>
```
If issues with severity "error": fix before continuing (use `rockets-build-fix` skill if needed).

**6. Go to step 1.**

On loop exit: print final coverage report:
```bash
node skills/rockets-orchestrator/scripts/check-sbvr-coverage.js --project <path>
```

**Token economy for loop:**
| Per-rule cost | Tool | Tokens |
|---|---|---|
| Implement rule | agent (sonnet) | ~5-15k |
| Mark + validate | scripts | 0 |

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
3. Business rule coverage (N/N rules, 100%)
4. Migrations run (file names)
5. Seeders run (roles, users, sample data created)
6. Build status (pass/fail)
7. Smoke test results (if run)
8. Files created/changed
9. Open risks or follow-up tasks

## Token Economy

| Step | Tool | Tokens |
|------|------|--------|
| Plan + Q&A | rockets-planner (opus) | ~15-25k |
| Bootstrap | script | 0 |
| CRUD generation | orchestrate.js (scripts) | 0 |
| Migrations | typeorm CLI | 0 |
| Seeders | npm run seed | 0 |
| Non-CRUD modules (Step 4) | agent (sonnet) | ~10k/module |
| Coverage loop (Step 4b, per rule) | agent (sonnet) | ~5–15k |
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
- `skills/rockets-migration/SKILL.md` — owns migration generation and execution
- `skills/rockets-seeder/SKILL.md` — owns seeder patterns
- `development-guides/SPEC_GAP_QUESTIONS.md` — Q&A question templates
