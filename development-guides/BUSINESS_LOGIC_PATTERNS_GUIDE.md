# BUSINESS LOGIC PATTERNS GUIDE

> **For AI Tools**: This guide contains reusable patterns for everything NOT standard CRUD. Use this after entities are generated with `rockets-crud-generator`. Each pattern includes when to use, files to create, parameterized templates, and Rockets compliance rules.

## Pattern Index

| # | Pattern | SBVR Trigger | Files Created |
|---|---------|-------------|---------------|
| 1 | [State Machine + History](#pattern-1-state-machine--history) | Status enums, "transition from X to Y only when..." | `{entity}-status.service.ts`, `{entity}-status-history.entity.ts` |
| 2 | [Custom CRUD Actions](#pattern-2-custom-crud-actions) | "Admin can approve/cancel/complete..." | Methods added to existing CRUD controller |
| 3 | [Cross-Service Orchestration](#pattern-3-cross-service-orchestration) | Multi-step workflows crossing entities | `{workflow}-workflow.service.ts` |
| 4 | [Event-Driven Automation](#pattern-4-event-driven-automation) | "System does X when Y happens" | `{module}.listener.ts` using EventEmitter2 |
| 5 | [Email Notification + Audit](#pattern-5-email-notification--audit) | "System sends email when..." | `notification.service.ts`, Handlebars templates |
| 6 | [File Upload Pipeline](#pattern-6-file-upload-pipeline) | File format/size rules, upload requirements | `{entity}-upload.controller.ts`, `{entity}-upload.service.ts` |
| 7 | [External API Provider](#pattern-7-external-api-provider) | "System queries API X for..." | `{provider}-http.service.ts` |
| 8 | [Deduplication / Reference Sync](#pattern-8-deduplication--reference-sync) | "Check if exists locally, create if not" | Logic in model service or `{entity}-sync.service.ts` |
| 9 | [Transactional Multi-Entity](#pattern-9-transactional-multi-entity) | "Registration creates X, Y, Z together" | `DataSource.transaction()` in workflow service |
| 10 | [Denormalized View](#pattern-10-denormalized-view) | Read-heavy joins, role-based filtering | `{view}.view-entity.ts`, read-only controller |

---

## Pattern 1: State Machine + History

### When to Use
- Entity has a `status` enum field (SBVR: "X has status: one of {A, B, C}")
- Transitions are conditional (SBVR: "transition from A to B only when condition")
- History of state changes needed for audit

### Files to Create
- `{entity}-status.service.ts` — enforces transition map, calls model service
- `{entity}-status-history.entity.ts` — records each transition (optional, for audit)
- `{entity}-status.constants.ts` — enum + transition map

### Template: Status Constants

```typescript
// src/modules/{entity}/{entity}-status.constants.ts

export enum {Entity}Status {
  {STATUS_A} = '{status_a}',
  {STATUS_B} = '{status_b}',
  {STATUS_C} = '{status_c}',
  {STATUS_D} = '{status_d}',
}

/**
 * Transition map: current status -> allowed next statuses with conditions.
 * The AI adapts conditions from SBVR rules.
 */
export const {ENTITY}_TRANSITION_MAP: Record<
  {Entity}Status,
  { to: {Entity}Status; condition?: string }[]
> = {
  [{Entity}Status.{STATUS_A}]: [
    { to: {Entity}Status.{STATUS_B}, condition: '{condition_description}' },
  ],
  [{Entity}Status.{STATUS_B}]: [
    { to: {Entity}Status.{STATUS_C}, condition: '{condition_description}' },
  ],
  [{Entity}Status.{STATUS_C}]: [
    { to: {Entity}Status.{STATUS_D}, condition: '{condition_description}' },
  ],
  [{Entity}Status.{STATUS_D}]: [],  // terminal state
};
```

### Template: Status Service

```typescript
// src/modules/{entity}/{entity}-status.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { {Entity}ModelService } from './{entity}-model.service';
import { {Entity}Status, {ENTITY}_TRANSITION_MAP } from './{entity}-status.constants';

@Injectable()
export class {Entity}StatusService {
  constructor(
    private readonly {entity}ModelService: {Entity}ModelService,
  ) {}

  async transition(
    {entity}Id: string,
    targetStatus: {Entity}Status,
    context: { userId: string; [key: string]: unknown },
  ): Promise<void> {
    const {entity} = await this.{entity}ModelService.byId({entity}Id);
    const currentStatus = {entity}.status as {Entity}Status;

    const allowed = {ENTITY}_TRANSITION_MAP[currentStatus];
    const match = allowed.find((t) => t.to === targetStatus);

    if (!match) {
      throw new BadRequestException(
        `Cannot transition from "${currentStatus}" to "${targetStatus}"`,
      );
    }

    // AI adds domain-specific condition checks here based on SBVR rules
    // e.g., if (match.condition === 'files_uploaded') { await this.validateFilesUploaded({entity}Id); }

    await this.{entity}ModelService.update({ id: {entity}Id, status: targetStatus });
  }
}
```

### Rockets Compliance
- Status service injects **model service**, never repository
- Transition map is the single source of truth — no direct status updates elsewhere
- Controller delegates to status service for all state changes

### Testing Strategy
- Unit test every valid transition
- Unit test every invalid transition (expect `BadRequestException`)
- Unit test condition checks (mock model service)

---

## Pattern 2: Custom CRUD Actions

### When to Use
- Non-standard verbs on existing entities (SBVR: "Admin can approve/cancel/complete X")
- Actions that change state + trigger side effects
- Actions that don't fit standard Create/Read/Update/Delete

### Files to Create
- Methods added to existing `{entity}.crud.controller.ts` or new `{entity}-actions.controller.ts`
- Logic in `{entity}-model.service.ts` or `{entity}-status.service.ts`

### Template: Custom Action Endpoint

```typescript
// Added to existing controller or in {entity}-actions.controller.ts
@Post(':id/{action}')
@ApiOperation({ summary: '{Action} a {entity}' })
@AccessControlCreateOne({Entity}Resource.One) // or appropriate ACL decorator
async {action}(
  @Param('id') id: string,
  @AuthUser() user: AuthenticatedUserInterface,
): Promise<{Entity}Dto> {
  return this.{entity}ModelService.{action}(id, { userId: user.id });
}
```

### Template: Action in Model Service

```typescript
// In {entity}-model.service.ts
async {action}(id: string, context: { userId: string }): Promise<{Entity}EntityInterface> {
  const {entity} = await this.byId(id);

  // Validate business rules from SBVR
  // e.g., "only if status is Pending"
  if ({entity}.status !== {Entity}Status.{REQUIRED_STATUS}) {
    throw new {Entity}Exception('Cannot {action}: invalid status');
  }

  // Perform the action
  return this.update({
    id,
    status: {Entity}Status.{NEW_STATUS},
    {action}Date: new Date(),
    {action}ByUserId: context.userId,
  });
}
```

### Rockets Compliance
- Action logic lives in model service, NOT controller
- Controller only does parameter extraction + delegation
- ACL decorators on each action endpoint

---

## Pattern 3: Cross-Service Orchestration

### When to Use
- Workflow spans 3+ entities (SBVR: multi-step processes)
- Sequence matters: step 2 depends on step 1
- Single entry point coordinates multiple model services

### Files to Create
- `{workflow}-workflow.service.ts` — orchestrates model services
- Register in the module that owns the workflow entry point

### Template: Workflow Service

```typescript
// src/modules/{module}/{workflow}-workflow.service.ts
import { Injectable } from '@nestjs/common';
import { {EntityA}ModelService } from '../{entity-a}/{entity-a}-model.service';
import { {EntityB}ModelService } from '../{entity-b}/{entity-b}-model.service';
import { {EntityC}ModelService } from '../{entity-c}/{entity-c}-model.service';

@Injectable()
export class {Workflow}WorkflowService {
  constructor(
    private readonly {entityA}ModelService: {EntityA}ModelService,
    private readonly {entityB}ModelService: {EntityB}ModelService,
    private readonly {entityC}ModelService: {EntityC}ModelService,
  ) {}

  async execute(input: {Workflow}InputDto): Promise<{Workflow}ResultDto> {
    // Step 1: Create/update entity A
    const a = await this.{entityA}ModelService.create(input.{entityA}Data);

    // Step 2: Create entity B linked to A
    const b = await this.{entityB}ModelService.create({
      ...input.{entityB}Data,
      {entityA}Id: a.id,
    });

    // Step 3: Create entity C linked to A and B
    const c = await this.{entityC}ModelService.create({
      ...input.{entityC}Data,
      {entityA}Id: a.id,
      {entityB}Id: b.id,
    });

    return { {entityA}: a, {entityB}: b, {entityC}: c };
  }
}
```

### Rockets Compliance
- Workflow service injects **model services only** (never repositories)
- Module that hosts the workflow imports modules that export the model services
- For atomicity, see Pattern 9 (Transactional Multi-Entity)

### Testing Strategy
- Mock all injected model services
- Test happy path end-to-end
- Test failure at each step (verify partial rollback behavior)

---

## Pattern 4: Event-Driven Automation

### When to Use
- SBVR: "It is obligatory that the system [verb] when [event]"
- Decoupled side effects (notifications, audit, sync)
- Multiple listeners for the same event

### Dependencies
- `@nestjs/event-emitter` (install: `yarn add @nestjs/event-emitter`)
- `EventEmitterModule.forRoot()` in `AppModule`

### Files to Create
- `{module}/events/{event-name}.event.ts` — event payload class
- `{module}/listeners/{event-name}.listener.ts` — handler

### Template: Event Class

```typescript
// src/modules/{module}/events/{event-name}.event.ts
export class {EventName}Event {
  constructor(
    public readonly {entity}Id: string,
    public readonly userId: string,
    public readonly payload: {
      // domain-specific fields from SBVR
      previousStatus?: string;
      newStatus?: string;
      [key: string]: unknown;
    },
  ) {}
}
```

### Template: Listener

```typescript
// src/modules/{module}/listeners/{event-name}.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { {EventName}Event } from '../events/{event-name}.event';

@Injectable()
export class {EventName}Listener {
  constructor(
    // Inject model services needed for the side effect
  ) {}

  @OnEvent('{module}.{event-name}')
  async handle(event: {EventName}Event): Promise<void> {
    // Implement the automation rule from SBVR
    // e.g., trigger metadata enrichment, send notification, create audit record
  }
}
```

### Template: Emitting Events (in model service or status service)

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

constructor(
  private readonly eventEmitter: EventEmitter2,
  // ...other deps
) {}

async someAction(...): Promise<...> {
  // ... business logic ...
  this.eventEmitter.emit(
    '{module}.{event-name}',
    new {EventName}Event(entityId, userId, { /* payload */ }),
  );
}
```

### Rockets Compliance
- Listeners are registered as providers in their module
- Listeners inject model services (never repositories)
- Events are fire-and-forget; for critical paths use synchronous calls instead

---

## Pattern 5: Email Notification + Audit

### When to Use
- SBVR: "System sends email notification when..."
- SBVR: "System logs/records [action] with timestamp"
- Audit trail requirements

### Dependencies
- `@nestjs-modules/mailer` or `@concepta/nestjs-email` if available
- Handlebars for templates (install: `yarn add @nestjs-modules/mailer nodemailer handlebars`)

### Files to Create
- `src/modules/notification/notification.service.ts` — sends emails, creates audit records
- `src/modules/notification/notification.module.ts` — module registration
- `src/modules/notification/templates/{template-name}.hbs` — email templates
- `src/modules/audit/audit.entity.ts` — audit trail entity (if not already existing)

### Template: Notification Service

```typescript
// src/modules/notification/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AuditModelService } from '../audit/audit-model.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly auditModelService: AuditModelService,
    // private readonly mailerService: MailerService, // when email is configured
  ) {}

  async send(params: {
    type: string;
    recipientEmails: string[];
    ccEmails?: string[];
    subject: string;
    templateName: string;
    templateData: Record<string, unknown>;
    relatedEntityType: string;
    relatedEntityId: string;
    triggeredByUserId: string;
  }): Promise<void> {
    // 1. Create audit record BEFORE dispatching
    await this.auditModelService.create({
      userId: params.triggeredByUserId,
      actionType: `notification.${params.type}`,
      actionDescription: `Email sent to ${params.recipientEmails.join(', ')}`,
      entityType: params.relatedEntityType,
      entityId: params.relatedEntityId,
      newValues: { subject: params.subject, recipients: params.recipientEmails },
    });

    // 2. Send email
    try {
      // await this.mailerService.sendMail({
      //   to: params.recipientEmails,
      //   cc: params.ccEmails,
      //   subject: params.subject,
      //   template: params.templateName,
      //   context: params.templateData,
      // });
      this.logger.log(`Email "${params.subject}" sent to ${params.recipientEmails.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      // Do not throw — notification failure should not break the workflow
    }
  }
}
```

### Rockets Compliance
- Notification service injects model services (audit), never repositories
- Audit record created BEFORE email dispatch (so failed sends are still tracked)
- Email failure is logged but does not throw (graceful degradation)

---

## Pattern 6: File Upload Pipeline

### When to Use
- SBVR: "file must be format X, not exceed Y MB"
- SBVR: role-based upload restrictions ("only imprinting artist uploads WAV")
- File validation before acceptance

### Dependencies
- `@nestjs/platform-express` (Multer — included in NestJS)
- Optional: `@concepta/nestjs-file` if available

### Files to Create
- `{entity}-upload.controller.ts` — upload endpoint with Multer
- `{entity}-upload.service.ts` — validation, storage, metadata extraction

### Template: Upload Controller

```typescript
// src/modules/{entity}/{entity}-upload.controller.ts
import {
  Controller, Post, Param, UseInterceptors,
  UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthUser } from '@concepta/nestjs-authentication';
import { {Entity}UploadService } from './{entity}-upload.service';

@Controller('{entities}')
export class {Entity}UploadController {
  constructor(private readonly uploadService: {Entity}UploadService) {}

  @Post(':id/upload-{file-type}')
  @ApiOperation({ summary: 'Upload {file-type} file for {entity}' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: {MAX_SIZE_BYTES} }, // e.g., 10 * 1024 * 1024
    fileFilter: (_req, file, cb) => {
      const allowed = [{ALLOWED_MIMES}]; // e.g., 'audio/wav', 'audio/x-wav'
      if (!allowed.includes(file.mimetype)) {
        cb(new BadRequestException('Invalid file format'), false);
      } else {
        cb(null, true);
      }
    },
  }))
  async upload{FileType}(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @AuthUser() user: AuthenticatedUserInterface,
  ) {
    return this.uploadService.process(id, file, {
      userId: user.id,
      fileType: '{file-type}',
    });
  }
}
```

### Template: Upload Service

```typescript
// src/modules/{entity}/{entity}-upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { {Entity}ModelService } from './{entity}-model.service';

@Injectable()
export class {Entity}UploadService {
  constructor(
    private readonly {entity}ModelService: {Entity}ModelService,
  ) {}

  async process(
    {entity}Id: string,
    file: Express.Multer.File,
    context: { userId: string; fileType: string },
  ) {
    // 1. Validate file content (not just MIME type)
    await this.validateFileContent(file, context.fileType);

    // 2. Store file (local FS, S3, etc.)
    const filePath = await this.storeFile(file, {entity}Id, context.fileType);

    // 3. Update entity with file path
    await this.{entity}ModelService.update({
      id: {entity}Id,
      [`${context.fileType}FilePath`]: filePath,
      [`${context.fileType}UploadTimestamp`]: new Date(),
      [`${context.fileType}UploadedByUserId`]: context.userId,
    });

    return { filePath, uploadedAt: new Date() };
  }

  private async validateFileContent(
    file: Express.Multer.File,
    fileType: string,
  ): Promise<void> {
    // AI adds domain-specific validation from SBVR rules
    // e.g., WAV: check 44.1kHz/16-bit minimum
    // e.g., MP3: check max 320kbps bitrate
    // e.g., max file size 10MB
    if (file.size > {MAX_SIZE_BYTES}) {
      throw new BadRequestException(`File exceeds maximum size`);
    }
  }

  private async storeFile(
    file: Express.Multer.File,
    entityId: string,
    fileType: string,
  ): Promise<string> {
    // AI implements storage strategy (local FS for MVP, S3 for production)
    const path = `uploads/${entityId}/${fileType}-${Date.now()}-${file.originalname}`;
    // await fs.writeFile(path, file.buffer);
    return path;
  }
}
```

### Rockets Compliance
- Upload service injects **model service** for entity updates
- File validation happens in service, not controller
- Controller handles Multer config + ACL; service handles logic

### Testing Strategy
- Unit test file validation (valid/invalid format, size limit)
- Mock model service for update calls
- E2E test with actual file upload

---

## Pattern 7: External API Provider

### When to Use
- SBVR: "System queries/retrieves from API X"
- Third-party metadata enrichment
- Rate-limited external services

### Dependencies
- `@nestjs/axios` (install: `yarn add @nestjs/axios axios`)

### Files to Create
- `src/modules/integration/{provider}-http.service.ts` — API client
- `src/modules/integration/integration.module.ts` — registers all providers

### Template: HTTP Provider Service

```typescript
// src/modules/integration/{provider}-http.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface {Provider}Response {
  // Define response shape from API docs
  [key: string]: unknown;
}

@Injectable()
export class {Provider}HttpService {
  private readonly logger = new Logger({Provider}HttpService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.getOrThrow('{PROVIDER}_API_URL');
    this.apiKey = this.configService.getOrThrow('{PROVIDER}_API_KEY');
  }

  async fetchBy{LookupField}(value: string): Promise<{Provider}Response | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/{endpoint}`, {
          params: { {lookupField}: value },
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 10000, // 10s timeout
        }),
      );
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) return null; // not found is OK
        this.logger.warn(`{Provider} API error: ${error.message}`);
      }
      return null; // graceful degradation — never throw for API failures
    }
  }
}
```

### Rockets Compliance
- HTTP service is a standalone provider — does NOT inject model services
- Orchestration layer (Pattern 3 or Pattern 8) calls both HTTP service and model services
- Config values from `ConfigService`, never hardcoded
- Graceful degradation: API failures return `null`, never throw

---

## Pattern 8: Deduplication / Reference Sync

### When to Use
- SBVR: "Check if exists locally, create if not"
- Reference data from external APIs that may already exist
- Upsert-like behavior with provenance tracking

### Files to Create
- Logic in model service, or `{entity}-sync.service.ts` for complex sync

### Template: Sync Logic in Model Service

```typescript
// In {entity}-model.service.ts or {entity}-sync.service.ts
async syncFromApi(data: {
  name: string;
  apiProviderName: string;
  apiOriginalId: string;
  userId: string;
}): Promise<{Entity}EntityInterface> {
  // 1. Check local existence (case-insensitive)
  const existing = await this.findByName(data.name);

  if (existing) {
    // 2a. Update provenance if not set
    const updates: Partial<{Entity}EntityInterface> = {};
    if (!existing.apiProviderName) updates.apiProviderName = data.apiProviderName;
    if (!existing.apiOriginalId) updates.apiOriginalId = data.apiOriginalId;

    if (Object.keys(updates).length > 0) {
      return this.update({ id: existing.id, ...updates });
    }
    return existing;
  }

  // 2b. Create new entity
  return this.create({
    name: data.name,
    status: '{Entity}Status.Active',
    apiProviderName: data.apiProviderName,
    apiOriginalId: data.apiOriginalId,
    createdByUserId: data.userId,
  });
}

private async findByName(name: string): Promise<{Entity}EntityInterface | null> {
  const results = await this.find({
    where: { name: ILike(name) },
    take: 1,
  });
  return results[0] ?? null;
}
```

### Rockets Compliance
- Sync logic in model service (owns entity access)
- Case-insensitive matching for deduplication
- Provenance fields updated atomically with entity

---

## Pattern 9: Transactional Multi-Entity

### When to Use
- SBVR: "Registration creates X, Y, Z together"
- All-or-nothing operations across entities
- Must roll back partial changes on failure

### Files to Create
- Transaction logic in workflow service (Pattern 3)

### Template: Transactional Workflow

```typescript
// In {workflow}-workflow.service.ts
import { DataSource } from 'typeorm';

constructor(
  private readonly dataSource: DataSource,
  private readonly {entityA}ModelService: {EntityA}ModelService,
  private readonly {entityB}ModelService: {EntityB}ModelService,
) {}

async executeAtomically(input: {Workflow}InputDto): Promise<{Workflow}ResultDto> {
  return this.dataSource.transaction(async (manager) => {
    // Use manager for raw operations when model services don't suffice,
    // but prefer model services for business logic validation.

    const a = await this.{entityA}ModelService.create(input.{entityA}Data);
    const b = await this.{entityB}ModelService.create({
      ...input.{entityB}Data,
      {entityA}Id: a.id,
    });

    // If any step throws, the entire transaction rolls back
    return { {entityA}: a, {entityB}: b };
  });
}
```

### Rockets Compliance
- `DataSource.transaction()` is the ONE exception where direct DataSource injection is allowed
- Model services are still used for business logic within the transaction
- Workflow service owns the transaction boundary

### When to Use Transactions vs Orchestration
- **Transaction** (Pattern 9): all entities in same database, strict atomicity needed
- **Orchestration** (Pattern 3): eventual consistency OK, or entities in different data stores

---

## Pattern 10: Denormalized View

### When to Use
- Read-heavy queries joining 3+ tables
- Role-based read filtering (different views per role)
- Dashboard/reporting data

### Files to Create
- `{view}.view-entity.ts` — TypeORM `@ViewEntity`
- Read-only controller or methods on existing controller

### Template: View Entity

```typescript
// src/modules/{module}/{view}.view-entity.ts
import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  expression: `
    SELECT
      {entity}.id,
      {entity}.name,
      {entity}.status,
      {related}.name AS {related}_name,
      COUNT({child}.id) AS {child}_count
    FROM {entity_table} {entity}
    LEFT JOIN {related_table} {related} ON {entity}.{related_id} = {related}.id
    LEFT JOIN {child_table} {child} ON {child}.{entity_id} = {entity}.id
    GROUP BY {entity}.id, {related}.name
  `,
})
export class {View}ViewEntity {
  @ViewColumn() id: string;
  @ViewColumn() name: string;
  @ViewColumn() status: string;
  @ViewColumn() {related}Name: string;
  @ViewColumn() {child}Count: number;
}
```

### Template: Read-Only Controller

```typescript
@Get('views/{view-name}')
@ApiOperation({ summary: 'Get {view-name} dashboard data' })
async get{View}(): Promise<{View}ViewDto[]> {
  return this.{entity}ModelService.get{View}Data();
}
```

### Rockets Compliance
- View entities are read-only — no Create/Update/Delete
- Register view entity in `TypeOrmModule.forFeature([{View}ViewEntity])`
- Add to `ormconfig.ts` entities array
- Read access through model service, never raw repository in controllers

---

## Cross-Cutting Concerns

### Module Registration Pattern

When a module uses multiple patterns, register all providers:

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([{Entity}Entity, {Entity}StatusHistoryEntity]),
    TypeOrmExtModule.forFeature({ [{ENTITY}_ENTITY_KEY]: { entity: {Entity}Entity } }),
    HttpModule, // if using Pattern 7
    {RelatedModule}, // if using Pattern 3
  ],
  controllers: [
    {Entity}CrudController,
    {Entity}UploadController, // Pattern 6
  ],
  providers: [
    // Standard CRUD
    {Entity}TypeOrmCrudAdapter,
    {Entity}ModelService,
    {Entity}CrudService,
    {Entity}AccessQueryService,
    // Business logic
    {Entity}StatusService,       // Pattern 1
    {Entity}UploadService,       // Pattern 6
    {EventName}Listener,         // Pattern 4
    {Provider}HttpService,       // Pattern 7
  ],
  exports: [{Entity}ModelService, {Entity}StatusService],
})
export class {Entity}Module {}
```

### Error Handling Pattern

All business logic patterns should use domain-specific exceptions:

```typescript
import { RuntimeException } from '@concepta/nestjs-exception';

export class {Entity}StatusTransitionException extends RuntimeException {
  constructor(message: string) {
    super({ message, httpStatus: HttpStatus.BAD_REQUEST });
  }
}
```

### Event Naming Convention

Format: `{module}.{action}.{timing}`

Examples:
- `song.status.changed`
- `purchase-authorization.created`
- `file.uploaded`
- `metadata.enrichment.completed`

---

## Pattern Composition

Most real-world features combine multiple patterns. Example from SBVR Music Management:

**Song Record Imprinting** combines:
- Pattern 1: Song status state machine (New -> Creation Process -> Ready for Review -> Available for Sale)
- Pattern 2: Custom action `POST /songs/:id/approve` for admin review
- Pattern 4: Event on status change triggers notification
- Pattern 5: Email to admin when both files uploaded
- Pattern 6: WAV upload by imprinting artist, MP3 upload by buyer

**Purchase Authorization Workflow** combines:
- Pattern 3: Orchestration across PurchaseAuthorization, Buyer, SongRecord
- Pattern 4: Event after procurement triggers imprinting notification
- Pattern 5: Email to buyer on creation, email to imprinting artist on completion

**ISRC Metadata Enrichment** combines:
- Pattern 4: Event on ISRC entry triggers enrichment
- Pattern 7: AudioDB, MusicFetch, Genius API providers
- Pattern 8: Dedup/sync for Artist, Album, Genre, Era, Publisher
- Pattern 9: Transaction for multi-entity reference data creation

---

## Related Guides

- [CRUD_PATTERNS_GUIDE.md](./CRUD_PATTERNS_GUIDE.md) — Standard CRUD (generate first, then add patterns from this guide)
- [SDK_SERVICES_GUIDE.md](./SDK_SERVICES_GUIDE.md) — Model service rules (foundation for all patterns)
- [ACCESS_CONTROL_GUIDE.md](./ACCESS_CONTROL_GUIDE.md) — ACL for custom endpoints
- [SBVR_EXTRACTION_GUIDE.md](./SBVR_EXTRACTION_GUIDE.md) — How to classify SBVR rules into these patterns
- `rockets-business-logic` skill — Pattern selection decision tree and implementation checklists
