---
description: Implement a full project from a requirements document (PRD/spec/RFC) with Rockets SDK patterns. Orchestrates planning, module generation, ACL, tests, and diagnostics with mandatory pattern gates.
---

# Rockets From Doc Command

Implements a project end-to-end from a requirements document using the Rockets workflow with strict pattern compliance.

## What This Command Does

1. Read and parse the source document (`goals`, `scope`, `entities`, `roles`, `endpoints`, `rules`).
2. Extract ALL rule categories using `SBVR_EXTRACTION_GUIDE.md` — entities, roles, state machines, custom endpoints, automation, validation, file uploads, notifications, API integrations, workflows.
3. Create an execution contract (phases, modules, dependencies, acceptance criteria). Include SBVR Coverage Summary mapping every B-rule and ST-rule to a phase and pattern.
4. Bootstrap project when needed (`rockets-project-bootstrap`).
5. Generate CRUD modules using `rockets-crud-generator` as default path.
6. Apply ACL and ownership rules (`rockets-access-control`).
7. Implement state machines (`rockets-business-logic` skill, Pattern 1) — status enums, transition maps, history entities.
8. Implement custom action endpoints (Pattern 2) — approve, cancel, assign, complete.
9. Implement workflow/orchestration services (Pattern 3) — cross-entity sequences.
10. Implement event-driven automation (Pattern 4) — listeners for domain events.
11. Implement notification service (Pattern 5) — if spec has email/notification rules.
12. Implement file upload pipelines (Pattern 6) — if spec has file format/size rules.
13. Implement external API providers (Pattern 7) — if spec has third-party API rules.
14. Implement remaining patterns (Patterns 8-10) — dedup/sync, transactions, views as needed.
15. Add tests by priority via `rockets-tdd-guide` + `development-guides/TESTING_GUIDE.md` — including state transitions, workflows, custom endpoints.
16. Run diagnostics and build checks (`rockets-runtime-diagnostics`).
17. Return an implementation report WITH behavioral rule coverage percentage.

## Usage

```
/rockets-from-doc examples/PRD.md
/rockets-from-doc /absolute/path/to/spec.md
/rockets-from-doc docs/requirements.md into examples/task-management-api
```

## Orchestration (Automatic)

- Planner/orchestrator: `rockets-planner`
- Architecture decisions: `rockets-architect`
- CRUD generation: `rockets-module-generator` + `rockets-crud-generator` skill
- ACL/security: `rockets-security-reviewer` + `/rockets-acl`
- Tests: `rockets-tdd-guide` + `/rockets-test`
- Build/runtime fixes: `rockets-build-resolver` + `/rockets-build-fix`
- Final review: `/rockets-review`

## Mandatory Pattern Gates

Block implementation if any rule below is violated:

1. CRUD modules must use `rockets-crud-generator` first.
2. `@InjectRepository(...)` is allowed only in `*-typeorm-crud.adapter.ts`.
3. Modules with custom logic or cross-module dependencies must include a model service with `@InjectDynamicRepository(...)`.
4. Modules with CRUD controllers must include `*-access-query.service.ts`.
5. Module structure must follow Rockets 12-file pattern.
6. Security defaults must be fail-secure (`deny by default` in access query logic).
7. `@InjectDynamicRepository(...)` is allowed only in `*-model.service.ts`; all other services must consume model services instead of injecting repositories directly.
8. State machine services must enforce transition maps — no direct status updates outside the status service.
9. Workflow services use model services for entity access (exception: `DataSource.transaction()` for atomicity).
10. Notification services must create audit records before dispatching emails.
11. After steps 7-14 (business logic), every behavioral rule from the SBVR spec must map to an implemented service. Report gaps before proceeding to tests.

## Output Contract

The command must always return:

1. Phase-by-phase summary (planned vs implemented).
2. Skills, agents, and commands used in each phase.
3. List of files created/changed.
4. Build/test/diagnostic results.
5. SBVR behavioral rule coverage: `X/Y rules implemented (Z%)`.
6. Open risks and follow-up tasks (if any).

## References

- `development-guides/ROCKETS_AI_INDEX.md`
- `development-guides/SBVR_EXTRACTION_GUIDE.md`
- `development-guides/BUSINESS_LOGIC_PATTERNS_GUIDE.md`
- `development-guides/CRUD_PATTERNS_GUIDE.md`
- `development-guides/ACCESS_CONTROL_GUIDE.md`
- `development-guides/SDK_SERVICES_GUIDE.md`
- `development-guides/TESTING_GUIDE.md`
- `skills/rockets-business-logic/SKILL.md`
