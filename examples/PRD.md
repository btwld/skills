# Product Requirements Document (PRD)
## Rockets SDK Pattern Compliance Specification

**Document version:** 3.1  
**Last updated:** 2026-02-11  
**Purpose:** Define Rockets-compliant implementation requirements for a backend with the domains **Task**, **User**, **Category**, and **Report**.

---

## 1. Overview

This PRD defines the mandatory behavior, architecture, workflows, and quality gates for implementing backend features in a Rockets SDK workspace.

It is a **standards + domain PRD**. Its goal is to ensure implementations are consistent, secure, and generator-first, with explicit domain targets for execution.

---

## 2. Goals

- Establish a single requirements baseline for Rockets-compliant implementation.
- Enforce generator-first CRUD architecture and strict dependency injection boundaries.
- Guarantee ACL and ownership rules are implemented as fail-secure.
- Standardize testing, diagnostics, and acceptance evidence.
- Enable reliable execution through command playbooks and skills.

---

## 3. Scope

### 3.1 In scope

- Project bootstrap and foundation setup.
- Domain modules for `Task`, `User`, `Category`, and `Report`.
- Module development using Rockets 12-file pattern.
- CRUD generation workflow and approved manual extensions.
- Access control (roles/resources/actions, Any vs Own semantics).
- DTO validation/serialization standards.
- Service-layer boundaries (adapter/model/non-model separation).
- Testing strategy (unit, integration/e2e, ACL/ownership).
- Runtime/build diagnostics and review gates.

### 3.2 Out of scope

- Deep vertical business rules outside task management/reporting context.
- UI/frontend behavior and design.
- Cloud/infrastructure provisioning specifics.

### 3.3 Domain baseline

The implementation MUST include the following domains:

1. `User`:
   - Identity and ownership reference for own-scope permissions.
   - Role association for ACL enforcement.
2. `Category`:
   - Classification entity for tasks.
   - CRUD endpoints with ACL controls.
3. `Task`:
   - Core work item entity.
   - CRUD endpoints with Any vs Own behavior.
   - Ownership enforcement in runtime query/service logic.
4. `Report`:
   - Non-CRUD/reporting module aggregating task data.
   - Explicit access constraints and authorization outcomes.

### 3.4 Domain relationships (minimum)

- A `Task` MUST belong to one `User` (owner semantics for own-scope checks).
- A `Task` SHOULD be associated with one `Category`.
- `Report` SHOULD consume task/category/user model services and MUST NOT inject repositories directly.

---

## 4. Normative Language

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative.

- **MUST/MUST NOT**: non-negotiable compliance requirement.
- **SHOULD**: strong recommendation unless justified otherwise.
- **MAY**: optional extension.

---
---

## 6. Mandatory Engineering Rules

The following rules are mandatory:

1. CRUD modules MUST be generated first using `rockets-crud-generator` before manual edits.
2. `@InjectRepository(...)` MUST appear only in `*-typeorm-crud.adapter.ts`.
3. `@InjectDynamicRepository(...)` MUST appear only in `*-model.service.ts`.
4. Non-model services MUST consume model services and MUST NOT access repositories directly.
5. Access query services MUST be fail-secure (deny by default).
6. Own-scope permissions MUST enforce ownership in query/service logic, not only ACL grants.

---

## 7. Project Foundation Requirements

1. Package choice MUST be intentional (`rockets-server` vs `rockets-server-auth`) based on authentication needs.
2. App configuration MUST follow guide standards for module registration, environment setup, and server startup.
3. Dynamic repository tokens required by features (for example user metadata scenarios) MUST be provided where applicable.
4. Foundation setup MUST pass build and startup smoke checks before feature module work begins.

---

## 8. Module Architecture Requirements

### 8.1 12-file pattern baseline

Each custom entity module MUST follow the Rockets standard module structure produced by templates/generator. Required responsibilities include:

- Entity definition
- CRUD adapter
- CRUD service
- Access query service
- Model service
- Controller
- Module wiring
- DTOs and pagination DTO
- Input interfaces (creatable/updatable)
- Public exports/indexes as defined by template

### 8.2 Generation-first workflow

1. Generate base files with `rockets-crud-generator`.
2. Add custom logic only after generation.
3. Keep generated structure intact unless a documented Rockets pattern requires extension.

### 8.3 Service composition

- Non-CRUD/custom services MUST depend on model services.
- Modules owning entities MUST export their model service for reuse.

---

## 9. Access Control and Security Requirements

### 9.1 ACL model

1. Every protected module MUST define resources and actions.
2. Role grants MUST cover Any and/or Own scopes as required.
3. Admin/global elevated roles MAY have broad grants, but module-level checks still MUST remain safe.

### 9.2 Fail-secure query behavior

Access query services MUST deny when permission context is missing, invalid, or ambiguous.

### 9.3 Ownership enforcement

For Own scope:

1. Filtering constraints MUST be enforced in query/service logic.
2. Authorization MUST NOT rely exclusively on ACL grant declaration.
3. Read/update/delete paths MUST all enforce ownership consistently.

### 9.4 Report/non-CRUD endpoints

Report or aggregation endpoints MUST explicitly define access constraints and expected responses for authorized vs unauthorized callers.

---

## 10. DTO and API Contract Requirements

1. DTOs MUST validate input shape and constraints.
2. DTO serialization rules SHOULD prevent accidental data exposure.
3. Nested DTO structures MUST be explicitly typed and validated.
4. CRUD and custom endpoints MUST document request/response contracts, error conditions, and pagination/filter semantics.
5. Protected endpoints MUST have clear expected status behavior (`401`, `403`, `404`, `422`, etc., as applicable).

---

## 11. Testing Requirements

### 11.1 Minimum test coverage areas

Implementations MUST include tests for:

- CRUD happy paths
- Validation failures
- ACL allow/deny behavior
- Own-scope ownership enforcement
- Fail-secure default deny scenarios
- Non-CRUD/custom logic using model-service boundaries

### 11.2 Test layers

- Unit tests for service/query rules
- Integration/e2e tests for endpoint behavior
- Focused tests for ACL matrix and ownership edge cases

### 11.3 Quality style

Tests SHOULD follow clear Arrange-Act-Assert structure and deterministic fixtures.

---

## 12. Diagnostics and Review Gates

Before completion, implementation MUST pass:

1. Build checks
2. Relevant test suites
3. Runtime diagnostics (including pattern/DI guardrails)
4. Security/access review

Recommended diagnostic command:

```bash
node skills/rockets-runtime-diagnostics/scripts/diagnose.js <project-path> --run-build --run-tests
```

---

## 13. Execution Workflow (Definition of Done)

A feature/module is done only when all are true:

1. Generated with `rockets-crud-generator` first.
2. Module structure matches Rockets pattern expectations.
3. No repository injection boundary violations.
4. ACL resources/grants present and tested.
5. Own-scope logic enforced in runtime query/service path.
6. DTOs and endpoint contracts validated.
7. Tests and diagnostics pass.
8. Review gate (`/rockets-review`) is clean or has documented accepted risks.

---

## 14. Evidence and Implementation Report Requirements

Each implementation cycle SHOULD produce an evidence report containing:

1. Planned phases vs implemented phases.
2. Commands/skills/agents used.
3. Files created/modified.
4. Build/test/diagnostic outcomes.
5. Open risks and follow-up tasks.

---

## 15. Anti-Patterns (Explicitly Forbidden)

- Writing CRUD modules manually before generator execution.
- Injecting repositories in controllers or non-model services.
- Using `@InjectDynamicRepository(...)` outside model service files.
- ACL grants without runtime ownership enforcement for Own scope.
- Access query logic that defaults to allow on missing context.
- Merging feature work without ACL and ownership tests.

---

## 16. Acceptance Criteria

This PRD is successfully satisfied when:

1. A new module can be implemented end-to-end via Rockets commands without hidden assumptions.
2. All mandatory engineering rules are demonstrably enforced in code and tests.
3. Access control behavior is verifiable for Any, Own, and deny-default cases.
4. Diagnostics/review produce no blocking pattern violations.
5. Implementation evidence is reproducible by another engineer using this document.

---