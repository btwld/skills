# Rockets SDK Plugin — btwld

Claude Code plugin providing reusable skills, commands, agents, and hooks for Rockets SDK projects (NestJS + TypeORM + Concepta).

- **Plugin manifest**: `.claude-plugin/plugin.json`
- **Hooks config**: `hooks/hooks.json`

## Canonical Structure

- `development-guides/`: source of truth for Rockets SDK patterns
- `skills/`: executable skills (generators, diagnostics, bootstrap)
- `commands/`: reusable command playbooks (`rockets-*`)
- `agents/`: role-specific behavior specs (planner, reviewer, security, etc.)
- `hooks/`: guardrails and reminders
- `examples/`: sample specs and generated projects

## Plugin Development

- Validate plugin: `claude plugin validate .`
- Test locally in a target project: `claude --plugin-dir .`
- Install to a project: `claude plugin install . --scope project`
- Hooks are in `hooks/hooks.json` — PreToolUse blocks violations, PostToolUse reminds

## Routing Rules

1. Start from task intent.
2. Use a `commands/rockets-*.md` command as the default entrypoint.
3. Treat `agents/` as internal executors for commands (not primary day-to-day entrypoints).
4. Use `skills/` as implementation engines called by commands/agents.
5. Validate with diagnostics/tests before finalizing.
6. Use `development-guides/ROCKETS_AI_INDEX.md` to choose exact guides.

## Command-First Policy

- `commands/` are the official interface for normal usage.
- `agents/` are internal and should be invoked directly only for advanced/situational work.
- Detailed checklists and rules live in `development-guides/` (single source of truth).
- `commands/` and `agents/` should stay concise and avoid duplicating long policy text.

## Execution Matrix (Command → Agent → Skill)

| Command | Primary Agent | Primary Skill(s) |
|---|---|---|
| `/rockets-plan` | `rockets-planner` | (planning only; guide-driven) |
| `/rockets-module` | `rockets-module-generator` | `rockets-crud-generator`, `rockets-access-control` |
| `/rockets-acl` | (default executor) | `rockets-access-control` |
| `/rockets-business-logic` | `rockets-architect` or `rockets-planner` (as needed) | `rockets-business-logic` |
| `/rockets-test` | `rockets-tdd-guide` | (testing via `development-guides/TESTING_GUIDE.md`) |
| `/rockets-review` | `rockets-code-reviewer`, `rockets-auto-reviewer` (haiku) | (review via guides) |
| `/rockets-build-fix` | `rockets-build-resolver` | `rockets-runtime-diagnostics` |
| `/rockets-from-doc` | `rockets-planner` + Agent Teams (or sequential fallback) | `rockets-orchestrator`, `rockets-crud-generator`, all relevant skills |

## Agent Teams

When `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is enabled, commands like `/rockets-from-doc` auto-form teams for parallel execution.
See [AGENT_TEAMS_GUIDE.md](./development-guides/AGENT_TEAMS_GUIDE.md) for team composition, communication rules, and task dependencies.

## Task Decision Tree

New project setup       → rockets-project-bootstrap skill
New entity / CRUD       → /rockets-module (uses rockets-crud-generator)
                          then: /rockets-acl, /rockets-test, /rockets-review
Business logic / non-CRUD → /rockets-business-logic (uses rockets-business-logic skill)
Build/runtime error     → /rockets-build-fix + rockets-runtime-diagnostics
Full project from spec  → /rockets-from-doc (uses rockets-orchestrator + Agent Teams)
Architecture/planning   → /rockets-plan
Testing                 → /rockets-test
Code review             → /rockets-review (uses rockets-auto-reviewer for automated checks)

NEVER: Read a guide to copy-paste module code. Use the generator.

## Deprecation Policy

- Keep deprecated files for one migration cycle with explicit replacement notes.
- Do not delete immediately; remove after a confirmed migration window.

### Current Deprecations

None.

## Mandatory Engineering Rules

1. CRUD modules must be generated first (`rockets-crud-generator`) before manual edits.
2. `@InjectRepository(...)` is only allowed in `*-typeorm-crud.adapter.ts`.
3. `@InjectDynamicRepository(...)` is only allowed in `*-model.service.ts` and `*-access-query.service.ts`.
4. Non-model services must consume model services, never repositories directly.
5. Access query services must be fail-secure (default deny).
6. For own-scope permissions, enforce ownership in query/service logic, not only in ACL grants.
7. State machine services must enforce transition maps — no direct status updates.
8. Workflow services use model services for entity access (except `DataSource.transaction()`).
9. Notification services must create audit records before dispatching.

## Golden Rule

Do not duplicate policy across agent-specific files. Keep shared rules in this file (`CLAUDE.md`).

## Decision Enforcement

- "New entity/module" → ALWAYS use `rockets-crud-generator` skill (or `/rockets-module`)
- "Business logic / non-CRUD" → `/rockets-business-logic`
- "New project" → Use `rockets-project-bootstrap` skill
- Guides are for understanding patterns, NEVER for copying module code

## Claude Workflow

1. Read this file (`CLAUDE.md`)
2. Route by `development-guides/ROCKETS_AI_INDEX.md`
3. Execute via `commands/` + `skills/`
4. Validate with diagnostics/tests
