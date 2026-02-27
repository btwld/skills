---
name: rockets-orchestrator
description: Orchestrate multi-entity Rockets SDK project generation with topological sorting, wave-based execution, validation gates, and cross-session state. Supports Agent Teams for parallel generation or sequential fallback.
---

# Rockets Orchestrator

Generates complete Rockets SDK projects from a parsed spec — multiple entities, relations, ACL — with automatic dependency ordering, validation gates, and progress tracking.

## Quick Start

```bash
# Sequential mode (no Agent Teams needed)
node skills/rockets-orchestrator/scripts/orchestrate.js \
  --project ./apps/api \
  --spec .rockets/plan.json

# Dry run (show waves without executing)
node skills/rockets-orchestrator/scripts/orchestrate.js \
  --project ./apps/api \
  --spec .rockets/plan.json \
  --dry-run

# Resume from last checkpoint
node skills/rockets-orchestrator/scripts/orchestrate.js \
  --project ./apps/api \
  --resume
```

## How It Works

### 1. Topological Sort

Entities are sorted by dependency graph (relations). Entities with no dependencies are generated first. Entities that depend on others wait until their dependencies are done.

```
Wave 1: Category, Tag          (no deps)
Wave 2: Product                 (depends on Category)
Wave 3: ProductTag              (depends on Product, Tag)
```

### 2. Wave Execution

Each wave runs:
1. **Generate**: `generate.js` for each entity in the wave
2. **Integrate**: `integrate.js` writes files + wires into project
3. **Validate**: `validate.js` checks structural rules
4. Gate: if validation fails, stop and report (don't continue to next wave)

### 3. Migration Generation

After all waves complete and build passes:
1. **Try** `typeorm migration:generate` (requires a running database) — ~98% confidence
2. **Fallback** if no DB: static migration from entity configs — ~65-70% confidence
3. Static migrations carry a disclaimer comment; prefer DB-verified generation for production

### 4. Final Smoke Test

After all waves + migration:
1. Run `validate.js --build` for full TypeScript compilation check
2. Optionally run `smoke-test-endpoints.js` for HTTP endpoint testing

### 4. Cross-Session State

Progress is saved to `.rockets/state.json` in the project directory:
```json
{
  "startedAt": "2026-02-25T10:00:00Z",
  "waves": [
    { "index": 0, "entities": ["category", "tag"], "status": "completed" },
    { "index": 1, "entities": ["product"], "status": "in_progress" }
  ],
  "completedEntities": ["category", "tag"],
  "failedEntities": [],
  "currentWave": 1
}
```

Use `--resume` to continue from the last checkpoint.

## Spec Format (`.rockets/plan.json`)

The plan.json is created by the `rockets-planner` agent. See `agents/rockets-planner.md` for the full schema and rules.

Each entity in `plan.json` follows the same config schema as `rockets-crud-generator` (see `skills/rockets-crud-generator/SKILL.md`). The orchestrator passes each entity config directly to `generate.js`.

## Agent Teams Mode

When `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is enabled, the `/rockets-from-doc` command creates a team instead of running the script:

| Role | Model | Responsibility |
|------|-------|---------------|
| **Lead** | opus | Parse spec, create tasks with dependencies, coordinate waves |
| **Generator** | sonnet | Run `generate.js` + `integrate.js` per entity |
| **Reviewer** | haiku | Validate against 9 Engineering Rules (see `rockets-auto-reviewer`) |
| **Tester** | sonnet | Run `validate.js` + `smoke-test-endpoints.js` |
| **Builder** | sonnet | Fix build errors (max 3 retries) |

Teammates communicate directly — Reviewer sends fixes to Generator without going through Lead. Tasks use the built-in task list with `blockedBy` dependencies matching the topological sort.

## Scripts

| Script | Purpose | Tokens |
|--------|---------|--------|
| `orchestrate.js` | Batch generation with waves + migration (sequential fallback) | 0 |

## Options

| Flag | Description |
|------|-------------|
| `--project <path>` | Path to the project root (required) |
| `--spec <path>` | Path to plan.json (default: `<project>/.rockets/plan.json`) |
| `--dry-run` | Show waves without executing |
| `--resume` | Resume from `.rockets/state.json` |
| `--skip-smoke` | Skip endpoint smoke test at end |
| `--skip-migration` | Skip migration generation step |
| `--validate-only` | Only run validation (no generation) |

## Output

```json
{
  "success": true,
  "waves": [
    {
      "index": 0,
      "entities": ["category", "tag"],
      "status": "completed",
      "generated": 2,
      "validated": true
    }
  ],
  "summary": {
    "totalEntities": 4,
    "completed": 4,
    "failed": 0,
    "buildPassed": true,
    "smokeTestPassed": true
  }
}
```
