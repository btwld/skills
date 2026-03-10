# 🤖 ROCKETS AI NAVIGATION HUB

> **For AI Tools**: This is your navigation hub for Rockets SDK development. Use this to quickly find the right guide for your task.

## 📋 **Quick Tasks**

### **🏗️ Phase 1: Project Foundation Setup**

> Use NestJS **11** and all `@concepta/nestjs-*` at **7.0.0-alpha.10**. See [CONFIGURATION_GUIDE.md — Package Version Requirements](./CONFIGURATION_GUIDE.md#package-version-requirements).

| Task | Guide | Lines |
|------|-------|-------|
| **Align package versions** (NestJS 11, concepta 7.0.0-alpha.10) | [CONFIGURATION_GUIDE.md — Package Version Requirements](./CONFIGURATION_GUIDE.md#package-version-requirements) | 50 |
| **Choose packages** (rockets vs rockets-auth) | [ROCKETS_PACKAGES_GUIDE.md](./ROCKETS_PACKAGES_GUIDE.md) | 400 |
| **Configure application** (main.ts, modules, env) | [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) | 250 |
| **Provide dynamic repo token** (`userMetadata` via `TypeOrmExtModule.forFeature`) | [ROCKETS_PACKAGES_GUIDE.md](./ROCKETS_PACKAGES_GUIDE.md#phase-31-dynamic-repository-tokens-critical) | ~

### **🎯 Phase 2: Module Development**

> **Note**: `user/` and `role/` modules are managed by the SDK (`RocketsAuthModule`). The 12-file pattern below is for **new custom modules** (e.g., Product, Order).

| Task | Guide | Lines |
|------|-------|-------|
| **Generate complete modules** | `rockets-crud-generator` skill | — |
| **CRUD patterns** (services, controllers, adapters) | [CRUD_PATTERNS_GUIDE.md](./CRUD_PATTERNS_GUIDE.md) | 300 |
| **Add security** (ACL setup, access control, permissions, roles, ownership filtering) | [ACCESS_CONTROL_GUIDE.md](./ACCESS_CONTROL_GUIDE.md) | 250 |
| **Create DTOs** (validation, PickType patterns) | [DTO_PATTERNS_GUIDE.md](./DTO_PATTERNS_GUIDE.md) | 150 |
| **Write tests** (unit, e2e, fixtures, AAA pattern) | [TESTING_GUIDE.md](./TESTING_GUIDE.md) | 800 |
| **Custom logic / non-CRUD** (any service that uses entities: use model services; every module exposes a model service for its entity) | Skill **rockets-business-logic** + [SDK_SERVICES_GUIDE.md](./SDK_SERVICES_GUIDE.md) | — |

### **🏭 Phase 3: Business Logic Implementation**

> After CRUD modules are generated, implement behavioral rules, state machines, workflows, and integrations.

| Task | Guide | Lines |
|------|-------|-------|
| **State machines, workflows, custom endpoints, events** | [BUSINESS_LOGIC_PATTERNS_GUIDE.md](./BUSINESS_LOGIC_PATTERNS_GUIDE.md) | 600 |
| **SBVR rule extraction and classification** | [SBVR_EXTRACTION_GUIDE.md](./SBVR_EXTRACTION_GUIDE.md) | 150 |
| **Pattern implementation checklists** | `rockets-business-logic` skill | — |

### **🤖 Agent Teams & Orchestration**
| Task | Guide | Lines |
|------|-------|-------|
| **Agent team formation** (when to form, roles, communication) | [AGENT_TEAMS_GUIDE.md](./AGENT_TEAMS_GUIDE.md) | 40 |

### **🔧 Advanced Integration**
| Task | Guide | Lines |
|------|-------|-------|
| **Add @concepta packages** (ecosystem integration) | [CONCEPTA_PACKAGES_GUIDE.md](./CONCEPTA_PACKAGES_GUIDE.md) | 350 |
| **Advanced module patterns** (ConfigurableModuleBuilder, provider factories) | [ADVANCED_PATTERNS_GUIDE.md](./ADVANCED_PATTERNS_GUIDE.md) | 400 |
| **SDK service integration** (extend vs implement, service patterns) | [SDK_SERVICES_GUIDE.md](./SDK_SERVICES_GUIDE.md) | 300 |
| **Advanced entities** (complex relationships, views, inheritance) | [ADVANCED_ENTITIES_GUIDE.md](./ADVANCED_ENTITIES_GUIDE.md) | 450 |
| **Custom authentication** (providers, strategies, guards, MFA) | [AUTHENTICATION_ADVANCED_GUIDE.md](./AUTHENTICATION_ADVANCED_GUIDE.md) | 400 |

---

## 🚦 **Development Workflow**

### **New Project Setup (5 minutes)**
1. 📖 Read [ROCKETS_PACKAGES_GUIDE.md](./ROCKETS_PACKAGES_GUIDE.md) - Choose your packages
2. 📖 Read [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) - Configure your app

### **Module Generation (Per entity)**
1. Run `rockets-crud-generator` skill - Generate 12-file module
2. 📖 Read [CRUD_PATTERNS_GUIDE.md](./CRUD_PATTERNS_GUIDE.md) - Validate CRUD patterns
3. 📖 Read [ACCESS_CONTROL_GUIDE.md](./ACCESS_CONTROL_GUIDE.md) - Add security
4. 📖 Read [DTO_PATTERNS_GUIDE.md](./DTO_PATTERNS_GUIDE.md) - Validate DTOs
5. 📖 Read [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Write comprehensive tests

### **Business Logic (After CRUD generation)**
1. 📖 Read [SBVR_EXTRACTION_GUIDE.md](./SBVR_EXTRACTION_GUIDE.md) - Classify all behavioral rules
2. 📖 Read [BUSINESS_LOGIC_PATTERNS_GUIDE.md](./BUSINESS_LOGIC_PATTERNS_GUIDE.md) - Select patterns
3. Use `rockets-business-logic` skill or `/rockets-business-logic` command
4. Verify behavioral rule coverage: every B-rule and ST-rule maps to code

### **First-round checklist (before /rockets-review)**
- **DTOs:** `@Exclude()` at class level on **all** DTO classes (base, Create, CreateMany, Update, ModelUpdate, Paginated); nested arrays need `@IsArray()` + `@ValidateNested({ each: true })` + `@Type(() => ChildDto)` — see [DTO_PATTERNS_GUIDE.md](./DTO_PATTERNS_GUIDE.md#first-round-dto-rules-catch-before-review).
- **Ownership fields:** Never accept `userId`/`ownerId` from request body in create DTOs. Inject from `@AuthUser()` in the controller — see [DTO_PATTERNS_GUIDE.md](./DTO_PATTERNS_GUIDE.md#first-round-dto-rules-catch-before-review).
- **ModelService:** Modules with custom logic or cross-module dependencies should have a model service and export it; any non-CRUD logic uses model services, never repositories. When adding a ModelService, add `{entity}-model.service.spec.ts` — see [TESTING_GUIDE.md](./TESTING_GUIDE.md).
- **ACL wiring:** `AppModule` must import `AccessControlModule.forRoot({ rules: acRules })`. Without this, ACL decorators silently fail.
- **ACL rules:** If Admin already has `resource(allResources)`, avoid duplicate grants for a single resource.
- **Non-CRUD controllers:** Must use `@AccessControlQuery({ service: ... })` + per-endpoint decorators. Never use `@UseGuards(AccessControlGuard)` alone — see [ACCESS_CONTROL_GUIDE.md](./ACCESS_CONTROL_GUIDE.md).

### **Copy/Paste Workflow Prompt (Project lifecycle)**
```text
I want to build a Rockets project following the standard pattern end-to-end.

1) Bootstrap the project from:
git@github.com:btwld/rockets-starter.git

2) For each new feature/entity, follow this sequence:
- /rockets-plan <Feature>
- /rockets-module <Entity>
- /rockets-acl <Entity>
- /rockets-test <EntityModule>
- /rockets-review

3) If anything fails in runtime/build/ACL, run:
node skills/rockets-runtime-diagnostics/scripts/diagnose.js <project-path> --run-build --run-tests

Use these skills and guides as source of truth:
- rockets-crud-generator skill (module generation)
- CRUD_PATTERNS_GUIDE.md (validation)
- ACCESS_CONTROL_GUIDE.md
- TESTING_GUIDE.md
```

---

## 🎯 **Package Ecosystem Overview**

### **Core Rockets Packages**
- **@bitwild/rockets**: Minimal auth + user metadata (2 endpoints)
- **@bitwild/rockets-auth**: Complete auth system (15+ endpoints)

### **@concepta Package Categories (32 total)**
- **Core**: common, crud, typeorm-ext (5 packages)
- **Auth**: local, jwt, google, github, apple, etc. (11 packages) 
- **Features**: access-control, email, file, etc. (16 packages)

---

## 📊 **Token Efficiency Guide**

### **For AI Tools - Optimal Reading Strategy:**
1. **Always start here** - ROCKETS_AI_INDEX.md (50 lines)
2. **Pick one guide** based on your task (150-400 lines each)
3. **Never read multiple guides** in one session (token limit)

### **File Size Reference:**
- 🟢 **Small** (50-200 lines): Quick reference, read anytime
- 🟡 **Medium** (200-400 lines): Perfect AI context size
- 🔴 **Large** (400+ lines): Read in focused sessions only

---

## 🎯 **AI Prompt Optimization**

### **For Setup Tasks:**
```
I need to setup a new project with Rockets SDK.
Read ROCKETS_PACKAGES_GUIDE.md and help me choose the right packages.
```

### **For Module Generation:**
```
I need to create a {Entity} module following Rockets patterns.
Use the rockets-crud-generator skill to generate all 12 files for me.
```

### **For CRUD Implementation:**
```
I need to implement CRUD operations for my {Entity} module.
Read CRUD_PATTERNS_GUIDE.md and show me the latest patterns.
```

### **For Security:**
```
I need to add access control to my {Entity} module.
Read ACCESS_CONTROL_GUIDE.md and implement ACL setup, roles, and security patterns.
```

### **For Testing:**
```
I need to write tests for my {ServiceName} following Rockets SDK patterns.
Read TESTING_GUIDE.md and generate unit tests with AAA pattern, fixtures, and mocks.
```

### **For Advanced Patterns:**
```
I need to implement {advanced feature} using advanced patterns.
Read ADVANCED_PATTERNS_GUIDE.md and help me with ConfigurableModuleBuilder patterns.
```

### **For SDK Services:**
```
I need to integrate with SDK services like UserModelService.
Read SDK_SERVICES_GUIDE.md and show me service extension vs implementation patterns.
```

### **For Complex Entities:**
```
I need to implement complex entity relationships with {requirements}.
Read ADVANCED_ENTITIES_GUIDE.md and help me with inheritance and view patterns.
```

### **For Custom Authentication:**
```
I need to customize authentication with {custom requirements}.
Read AUTHENTICATION_ADVANCED_GUIDE.md and implement custom providers and strategies.
```

### **For custom logic (non-CRUD):**
```
I need to implement logic that uses entity data but is not standard CRUD.
Read the rockets-business-logic skill and SDK_SERVICES_GUIDE.md. Use model services for custom logic; create a model service when needed (custom logic or cross-module dependency); no @InjectRepository in application services.
```

---

## ⚡ **Success Metrics**

**Your implementation is AI-optimized when:**
- ✅ Zero manual fixes needed after generation
- ✅ All TypeScript compilation errors resolved
- ✅ Proper business logic implementation
- ✅ Complete API documentation in Swagger
- ✅ Access control properly configured
- ✅ Error handling follows established patterns

---

**🚀 Start your journey: Pick a guide above and begin building with Rockets SDK!**
