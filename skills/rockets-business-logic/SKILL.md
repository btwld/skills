---
name: rockets-business-logic
description: This skill should be used when implementing business logic beyond standard CRUD — state machines, approval workflows, event-driven automation, notifications, file uploads, external API integration, or cross-entity orchestration. Use after CRUD modules are generated. Also covers the foundational rule that application services must inject model services, never repositories.
---

# Rockets Business Logic Skill

Implements business logic patterns that go beyond standard CRUD. This is a conceptual skill — the AI adapts parameterized templates from `BUSINESS_LOGIC_PATTERNS_GUIDE.md` to the domain.

## Scope

This skill covers all non-CRUD endpoint/workflow logic plus service-boundary enforcement.
It also covers general custom code patterns (model service injection, cross-module dependencies).

## Foundational Service Boundary Rules

Apply these rules before any pattern implementation:

1. Application services MUST inject model services (or CRUD services when no model service exists), never repositories.
2. `@InjectRepository(...)` is forbidden in custom/workflow/non-CRUD services.
3. If cross-module logic needs an entity without model service, create/export the model service first.
4. Modules must import providers from exporting modules; do not inject foreign entity repositories directly.
5. Keep controller logic thin: parameter extraction + delegation only.

### When to Create a Model Service

Create a model service for a module when:
- The module has **custom logic** beyond standard CRUD (aggregation, computed fields, business rules).
- **Other modules** need to consume that entity (cross-module dependency).

Modules with only standard CRUD may omit the model service.

### Example: Right vs Wrong

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

## When to Use

After CRUD modules are generated (`rockets-crud-generator`), use this skill to implement:
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

## Pattern Selection Decision Tree

```
What does the SBVR rule describe?
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
```

## Implementation Checklist Per Pattern

### Pattern 1: State Machine
- [ ] Create status enum in `{entity}-status.constants.ts`
- [ ] Create transition map (current -> allowed next states with conditions)
- [ ] Create `{entity}-status.service.ts` injecting model service
- [ ] Add status transition endpoint(s) to controller
- [ ] Register service in module providers + exports
- [ ] Verify: no direct status updates outside status service

### Pattern 2: Custom Actions
- [ ] Add action method to model service (business logic)
- [ ] Add endpoint to controller (parameter extraction + delegation)
- [ ] Add ACL decorator for the action endpoint
- [ ] Verify: action logic in model service, not controller

### Pattern 3: Orchestration
- [ ] Create `{workflow}-workflow.service.ts`
- [ ] Inject only model services from participating modules
- [ ] Import participating modules in host module
- [ ] Verify: no repository injection in workflow service

### Pattern 4: Events
- [ ] Install `@nestjs/event-emitter` if not present
- [ ] Add `EventEmitterModule.forRoot()` to AppModule
- [ ] Create event class in `events/` directory
- [ ] Create listener in `listeners/` directory
- [ ] Register listener as provider in module
- [ ] Emit event from model service or status service

### Pattern 5: Notifications
- [ ] Create notification service injecting audit model service
- [ ] Create email templates (Handlebars)
- [ ] Create audit record BEFORE dispatching email
- [ ] Handle email failure gracefully (log, don't throw)

### Pattern 6: File Upload
- [ ] Create upload controller with Multer interceptor
- [ ] Create upload service with file validation
- [ ] Configure allowed MIME types and max file size
- [ ] Update entity with file path via model service
- [ ] Add role-based ACL to upload endpoint

### Pattern 7: External API
- [ ] Install `@nestjs/axios` if not present
- [ ] Create `{provider}-http.service.ts` with timeout and error handling
- [ ] Config values from `ConfigService` (never hardcoded)
- [ ] Return null on API failure (graceful degradation)

### Pattern 8: Dedup/Sync
- [ ] Add `syncFromApi()` to model service
- [ ] Case-insensitive local lookup
- [ ] Update provenance fields if not already set
- [ ] Create new entity if not found locally

### Pattern 9: Transactions
- [ ] Inject `DataSource` in workflow service
- [ ] Wrap multi-entity operations in `dataSource.transaction()`
- [ ] Model services still handle business validation inside transaction

### Pattern 10: Views
- [ ] Create `@ViewEntity` with SQL expression
- [ ] Register in `TypeOrmModule.forFeature()` and `ormconfig.ts`
- [ ] Read-only controller or model service method
- [ ] No create/update/delete on view entities

## Validation Gate

After implementing business logic patterns:
1. `yarn build` — zero TypeScript errors
2. Behavioral rule coverage report — every B-rule and ST-rule from SBVR maps to implemented code
3. Event listeners registered — check module providers
4. Status transitions enforced — no direct status updates outside status service

## References

- `development-guides/BUSINESS_LOGIC_PATTERNS_GUIDE.md` — canonical pattern templates
- `development-guides/SBVR_EXTRACTION_GUIDE.md` — rule classification and extraction
- `development-guides/CRUD_PATTERNS_GUIDE.md` — CRUD foundation (generate first)
- `development-guides/SDK_SERVICES_GUIDE.md` — model service rules
