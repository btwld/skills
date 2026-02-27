---
description: Implement business logic patterns on existing Rockets projects — state machines, workflows, notifications, file uploads, API integrations. Use after CRUD modules are generated.
---

# Rockets Business Logic Command

Implements non-CRUD business logic using structured patterns from `BUSINESS_LOGIC_PATTERNS_GUIDE.md`.

## Usage

```
/rockets-business-logic                             — analyze project for missing business logic
/rockets-business-logic state-machine SongRecord    — implement state machine for entity
/rockets-business-logic workflow PurchaseAuth        — implement cross-entity workflow
/rockets-business-logic file-upload AudioFile        — implement file upload pipeline
/rockets-business-logic notification PurchaseAuth    — implement notification on event
/rockets-business-logic api-provider AudioDB         — implement external API provider
/rockets-business-logic events SongRecord            — implement event-driven automation
```

## What This Command Does

### Without Arguments (Analysis Mode)

1. Read the project's source spec (PRD/SBVR) if available.
2. Read existing modules in `src/modules/`.
3. Use `SBVR_EXTRACTION_GUIDE.md` to classify unimplemented rules.
4. Report gaps: which behavioral rules lack implementation, which patterns to apply.

### With Pattern + Entity Arguments

1. Read `BUSINESS_LOGIC_PATTERNS_GUIDE.md` for the specified pattern.
2. Read the target entity's existing module files.
3. Implement the pattern following the parameterized template.
4. Register new providers/controllers in the module.
5. Run `yarn build` to verify.

## Pattern Mapping

| Argument | Pattern # | Guide Section |
|----------|-----------|---------------|
| `state-machine` | 1 | State Machine + History |
| `custom-action` | 2 | Custom CRUD Actions |
| `workflow` | 3 | Cross-Service Orchestration |
| `events` | 4 | Event-Driven Automation |
| `notification` | 5 | Email Notification + Audit |
| `file-upload` | 6 | File Upload Pipeline |
| `api-provider` | 7 | External API Provider |
| `dedup-sync` | 8 | Deduplication / Reference Sync |
| `transaction` | 9 | Transactional Multi-Entity |
| `view` | 10 | Denormalized View |

## Orchestration

- Agent: `rockets-architect` (invoked for complex pattern decisions)
- Pattern templates: `development-guides/BUSINESS_LOGIC_PATTERNS_GUIDE.md`
- Extraction rules: `development-guides/SBVR_EXTRACTION_GUIDE.md`
- Skill implementation: `skills/rockets-business-logic/SKILL.md`
- Foundation: `rockets-custom-code` skill (model service injection rule)
- Build validation: `rockets-runtime-diagnostics`

## Mandatory Rules

1. CRUD modules must already exist before applying business logic patterns.
2. All business logic services inject model services, never repositories.
3. State machine transition maps are the single source of truth for status changes.
4. Notification services create audit records before dispatching.
5. External API failures return null (graceful degradation).
