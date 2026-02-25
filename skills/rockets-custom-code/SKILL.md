---
name: rockets-custom-code
description: Use when implementing any logic that is not standard CRUD. Ensures model services are used instead of direct repository injection for custom or cross-module logic.
---

# Rockets Custom Code Skill

> For **structured business logic patterns** (state machines, workflows, file upload, notifications, API integration), see the `rockets-business-logic` skill which references `BUSINESS_LOGIC_PATTERNS_GUIDE.md`. This skill covers the **general rule** that application services must use model services — the business logic skill provides the 10 specific pattern templates.

Use this skill whenever you implement **any logic that is not standard CRUD** — custom services, aggregation, or calls from one module to another. The rule is generic: **application services never inject repositories**; they use the **model service** of each entity they need.

> **Note:** Model services are **not** required for every module by default. They are needed when (a) a module has custom/non-CRUD logic, or (b) other modules need to consume that entity. Modules with only standard CRUD may omit the model service.

## When to use

- Any **custom service** that reads or aggregates data from one or more entities (reports, analytics, dashboards, etc.)
- Any **non-CRUD controller** or business logic that needs entity data
- When **another module** needs to use an entity: it should depend on that entity’s model service, not its repository

## Critical rule: no repository in application services

In **any** application service that is not an adapter or a model service itself:

- **Do not** use `@InjectRepository(Entity)`.
- **Do** inject the **model service** (or CRUD service when no model service exists) of each entity you need: e.g. `UserModelService`, `TaskModelService`, `CategoryCrudService`.

Repositories belong only in:

- **CRUD adapters** (e.g. `TaskTypeOrmCrudAdapter` with `@InjectRepository(TaskEntity)`)
- **Model services** (which use `@InjectDynamicRepository(key)` and are the single place that talks to the repo for that entity)

So: **Controller → Service → Model Services → (internal) Repository**. Never: application service → repository.

## When to create a model service

Create a model service for a module when:

- The module has **custom logic** beyond standard CRUD (aggregation, computed fields, business rules).
- **Other modules** need to consume that entity (cross-module dependency).

When a model service exists, it should **provide and export** access to the entity (e.g. `TaskModelService`, `UserModelService`). The CRUD service can call the model service for specific logic; any other module or custom service that needs that entity injects its model service. If an entity has no model service yet and you need custom access to it, create one (using `@InjectDynamicRepository(...)` and `find()`, `byId()`, or extending `ModelService` where DTOs allow), then use it everywhere that entity is needed outside CRUD.

## References

- **Rule and examples:** `development-guides/SDK_SERVICES_GUIDE.md` — "Critical Rules for SDK Services" and "Custom Service Implementation".
- **Where non-CRUD logic fits:** `development-guides/CRUD_PATTERNS_GUIDE.md` — "Custom Controllers" and "Custom logic (non-CRUD)".

## Checklist for custom or non-CRUD logic

1. **Module**  
   - Imports the modules that **export** the model services you need (e.g. `UserModule`, `TaskModule`), not `TypeOrmModule.forFeature([...])` for those entities.

2. **Custom / application service**  
   - Constructor injects only **model services** (and/or CRUD services where appropriate).  
   - No `@InjectRepository(Entity)` and no `Repository<Entity>`.

3. **If an entity has no model service yet**  
   - Add one in that entity’s module (e.g. `UserModelService`, `TaskModelService`) using `@InjectDynamicRepository(...)` and expose `find()`, `byId()`, etc.  
   - Export it from the module and inject it where needed.

4. **Controller**  
   - Injects only your service; ACL and Access Query as usual for the resource.

5. **Verify**  
   - `yarn build` and `yarn test`.

## Why this matters

- **Single place for repo access:** Only adapters and model services touch the repository.
- **Consistency:** Every entity is consumed via its model service (or CRUD service when applicable).
- **Testability and refactoring:** Services depend on model services, not TypeORM repositories.

## Example (custom service using other entities)

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
