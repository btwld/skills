# Business Logic Pattern Checklists

## Patterns
- [Pattern 1: State Machine](#pattern-1-state-machine)
- [Pattern 2: Custom Actions](#pattern-2-custom-actions)
- [Pattern 3: Orchestration](#pattern-3-orchestration)
- [Pattern 4: Events](#pattern-4-events)
- [Pattern 5: Notifications](#pattern-5-notifications)
- [Pattern 6: File Upload](#pattern-6-file-upload)
- [Pattern 7: External API](#pattern-7-external-api)
- [Pattern 8: Dedup/Sync](#pattern-8-dedupsync)
- [Pattern 9: Transactions](#pattern-9-transactions)
- [Pattern 10: Views](#pattern-10-views)
- [Pattern 11: Background Jobs](#pattern-11-background-jobs)
- [Pattern 12: Outbound Webhooks](#pattern-12-outbound-webhooks)

---

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

### Pattern 11: Background Jobs
Two sub-patterns depending on technology choice:

**11a: Cron (simple, no queue, @nestjs/schedule)**
- [ ] Install: `@nestjs/schedule`
- [ ] Add `ScheduleModule.forRoot()` to AppModule imports
- [ ] Create `{entity}-scheduler.service.ts` with `@Cron()` decorator
- [ ] Service injects model service(s) — no direct repository
- [ ] Register scheduler service in module providers
- [ ] Verify: scheduler logic in service, not in AppModule

**11b: Queue (distributed, with retry, bull/bullmq)**
- [ ] Install: `bull` + `@nestjs/bull` (or `bullmq` + `@nestjs/bullmq`)
- [ ] Add `BullModule.forRoot({ redis: {...} })` to AppModule
- [ ] Add `BullModule.registerQueue({ name: '{queue-name}' })` to feature module
- [ ] Create `{entity}-{action}.job.ts` — job payload interface
- [ ] Create `{entity}-{action}.processor.ts` with `@Processor('{queue-name}')` and `@Process()` method
- [ ] Processor injects model service — no direct repository
- [ ] Create `{entity}-queue.service.ts` — wraps `Queue.add()` calls (injected with `@InjectQueue`)
- [ ] Queue service injected into model service or event listener
- [ ] Register processor + queue service in module providers
- [ ] Verify: no direct repository injection in processor or queue service

**Rockets compliance:**
- Processor/scheduler MUST inject model services, not repositories (Rule 4)
- For own-entity operations: use the entity's model service
- For cross-module operations: import the exporting module and inject its model service

### Pattern 12: Outbound Webhooks
- [ ] Create `webhook-delivery.entity.ts` — logs every delivery attempt (url, payload, responseStatus, attemptedAt, success)
- [ ] Create `webhook-delivery` module + CRUD (via rockets-crud-generator)
- [ ] Create `{context}-webhook.service.ts` injecting WebhookDeliveryModelService + HttpService
- [ ] Install `@nestjs/axios` if not present
- [ ] Webhook service method: `dispatch(url, event, payload)`:
  - Creates audit record BEFORE dispatching (Rule 9)
  - POST with timeout (default 5s, configurable)
  - Update audit record with response status
  - On failure: log, don't throw (graceful degradation)
- [ ] If retry needed: integrate with Pattern 11b (queue) — queue a retry job on failure
- [ ] Emit from model service or event listener (Pattern 4) — never from controller
- [ ] Register webhook service in module providers + exports
- [ ] Config (webhook URLs, secrets) from `ConfigService` — never hardcoded

**Rockets compliance:**
- WebhookDelivery entity goes through crud-generator (12-file pattern)
- Webhook service uses WebhookDeliveryModelService for audit, never direct repo (Rule 2)
- Dispatch triggered by event listener (Pattern 4) — clean decoupling
