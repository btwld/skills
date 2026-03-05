---
name: rockets-business-logic
description: Implement non-CRUD logic in Rockets SDK projects — custom services, cross-module aggregation, state machines, workflows, notifications, file uploads, API integrations. Use when a service needs to read/write entities without being a CRUD adapter, when modules need to share data, or when implementing post-CRUD business patterns.
---

# Rockets Business Logic Skill

Covers two complementary concerns:

1. **Service boundary rule** — any application service that is not an adapter must inject model services, never repositories.
2. **Structured patterns** — state machines, workflows, events, notifications, file uploads, API integrations.

This skill subsumes the former `rockets-custom-endpoints` and `rockets-custom-code` guidance.

## Foundational Service Boundary Rules

Apply these rules before any pattern implementation:

1. Application services MUST inject model services (or CRUD services when no model service exists), never repositories.
2. `@InjectRepository(...)` is forbidden in custom/workflow/non-CRUD services.
3. If cross-module logic needs an entity without a model service, create and export the model service first.
4. Modules must import providers from exporting modules; never inject foreign entity repositories directly.
5. Keep controller logic thin: parameter extraction + delegation only.
6. **Data flow**: Controller → Service → Model Services → (internal) Repository. Never: application service → repository.

### When a model service is needed

Create a model service for a module when:
- The module has **custom logic** beyond standard CRUD (aggregation, computed fields, business rules).
- **Other modules** need to consume that entity (cross-module dependency).

If an entity has no model service yet and you need custom access to it, create one using `@InjectDynamicRepository(...)` and expose `find()`, `byId()`, etc. Export it from the module and inject it where needed.

### Module import rule for cross-module logic

The host module must import the modules that **export** the model services it needs (e.g. `UserModule`, `TaskModule`). Do not add `TypeOrmModule.forFeature([...])` for entities owned by other modules.

### Example — custom service using multiple entities

```typescript
// ✅ ReportService — injects model services only
@Injectable()
export class ReportService {
  constructor(
    private readonly userModelService: UserModelService,
    private readonly taskModelService: TaskModelService,
  ) {}

  async getUsersWithTaskCount(): Promise<UserTaskReportItemDto[]> {
    const users = await this.userModelService.find({ order: { email: 'ASC' } });
    // ... for each user: taskModelService.find({ where: { userId: user.id } })
  }
}
```

```typescript
// ❌ Wrong — direct repository in application service
@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectRepository(TaskEntity) private taskRepo: Repository<TaskEntity>,
  ) {}
}
```

## When to Use This Skill

After CRUD modules are generated (`rockets-crud-generator`), use this skill to implement:
- Custom services that read/aggregate data from one or more entities (reports, analytics, dashboards)
- Non-CRUD controllers or business logic that needs entity data
- Cross-module dependencies (module A consuming entity from module B)
- State machines with enforced transitions
- Custom action endpoints (approve, cancel, assign, complete)
- Cross-service workflow orchestration
- Event-driven automation (listeners)
- Email notifications with audit
- File upload pipelines with validation
- External API provider integration
- Deduplication / reference data sync
- Transactional multi-entity operations
- Denormalized views for reporting
- Background jobs (cron scheduling, queue-based processing)
- Outbound webhook dispatch with delivery audit

## Pattern Selection Decision Tree

```
What does the requirement describe?
|
+-- Custom service reading/aggregating entities?
|   -> Apply Foundational Rules + service checklist below
|
+-- Entity has status field with enumerated values?
|   -> Pattern 1: State Machine + History
|
+-- Non-CRUD verb on entity (approve, cancel, assign, complete)?
|   -> Pattern 2: Custom CRUD Actions
|
+-- Workflow crosses 3+ entities in sequence?
|   -> Pattern 3: Cross-Service Orchestration
|   +-- All entities in same DB and atomicity needed?
|       -> Also add Pattern 9: Transactional Multi-Entity
|
+-- "System does X when Y happens" (decoupled side effect)?
|   -> Pattern 4: Event-Driven Automation
|
+-- "System sends email/notification when..."?
|   -> Pattern 5: Email Notification + Audit
|
+-- File format/size rules, role-based upload restrictions?
|   -> Pattern 6: File Upload Pipeline
|
+-- "System queries/retrieves from external API"?
|   -> Pattern 7: External API Provider
|
+-- "Check if exists locally, create if not" (reference data sync)?
|   -> Pattern 8: Deduplication / Reference Sync
|
+-- Read-heavy joins, dashboard data, role-based filtering?
|   -> Pattern 10: Denormalized View
|
+-- "System processes jobs in background / runs cron / queue"?
|   -> Pattern 11: Background Jobs
|
+-- "System sends HTTP callback/webhook to third-party URL when event occurs"?
    -> Pattern 12: Outbound Webhooks
```

## Checklist: Custom or Non-CRUD Logic

1. **Module** — imports the modules that export the model services you need; no `TypeOrmModule.forFeature([...])` for foreign entities.
2. **Custom / application service** — injects only model services (and/or CRUD services where appropriate); no `@InjectRepository`.
3. **If entity has no model service yet** — add one using `@InjectDynamicRepository(...)`, export it from its module, then inject it here.
4. **Controller** — injects only your service; ACL and Access Query as usual for the resource.
5. **Verify** — `yarn build` and `yarn test`.

## Implementation Checklist Per Pattern

For the full checklist of each pattern, read `references/patterns.md`.

Read it when: you have identified the pattern number and need the step-by-step checklist.

## Validation Gate

After implementing business logic patterns:
1. `yarn build` — zero TypeScript errors
2. Behavioral rule coverage — every SBVR B-rule and ST-rule maps to implemented code
3. Event listeners registered — check module providers
4. Status transitions enforced — no direct status updates outside status service

## Implementing a Specific Rule from `.rockets/sbvr-rules.json`

When invoked for a specific rule in the coverage loop (Step 4b of `/rockets-from-doc`):

1. **Read the rule fields**: `id`, `type`, `description`, `entity`, `pattern`
2. **Select the pattern checklist** from `references/patterns.md` using `rule.pattern`
   - If `rule.pattern` is null/undefined (type `validation` or `derived-field`): implement inline in model service or response layer
3. **Implement the code**: create files, register providers, wire into module
   - Follow all Foundational Service Boundary Rules (no `@InjectRepository` in non-adapter services)
   - Follow the Mandatory Engineering Rules from `CLAUDE.md`
4. **Collect files created/modified** — you will report these to `check-sbvr-coverage.js`
5. **Do NOT mark as implemented** until code compiles (`yarn build` passes). The calling loop (Step 4b) will invoke `check-sbvr-coverage.js --mark-implemented` after you confirm completion.

**Per-type guidance:**

| type | What to implement |
|------|-------------------|
| `state-machine` | Pattern 1: status enum, transition map, status service, history entity |
| `custom-endpoint` | Pattern 2: action method in model service + endpoint in controller |
| `orchestration` | Pattern 3: workflow service injecting model services from participating modules |
| `automation` | Pattern 4: event class + listener + emit from model/status service |
| `notification` | Pattern 5: notification service + audit record before dispatch |
| `file-upload` | Pattern 6: upload controller + Multer + validation service |
| `api-integration` | Pattern 7: `{provider}-http.service.ts` with graceful degradation |
| `dedup-sync` | Pattern 8: `syncFromApi()` in model service |
| `transaction` | Pattern 9: `DataSource.transaction()` in workflow service |
| `background-job` | Pattern 11a (cron) or 11b (queue) based on `technology` field — scheduler/processor injects model service |
| `outbound-webhook` | Pattern 12: webhook service + delivery entity + audit log, triggered via Pattern 4 listener |
| `validation` | Guard logic in model service — throw before persisting |
| `derived-field` | Computed in response DTO or serializer — not persisted |

## References

- `development-guides/BUSINESS_LOGIC_PATTERNS_GUIDE.md` — canonical pattern templates
- `development-guides/SDK_SERVICES_GUIDE.md` — model service rules and custom service implementation
- `development-guides/SBVR_EXTRACTION_GUIDE.md` — rule classification, extraction, and coverage registry
- `development-guides/CRUD_PATTERNS_GUIDE.md` — CRUD foundation (generate first); also "Custom Controllers" and "Custom logic (non-CRUD)" sections
- `skills/rockets-orchestrator/scripts/check-sbvr-coverage.js` — coverage tracking script
- `references/patterns.md` — full implementation checklists for Patterns 1–12
