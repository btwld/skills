# Rockets SDK Skills

A Claude Code plugin that supercharges [Rockets SDK](https://github.com/btwld/rockets-starter) development with AI-powered code generation, review, diagnostics, and orchestration for NestJS + TypeORM + Concepta projects.

Also works with **Cursor** and **OpenAI Codex** (manual setup).

## Table of Contents

- [What It Does](#what-it-does)
- [Installation](#installation)
  - [Claude Code (Plugin)](#claude-code-plugin)
  - [Auto-install for Teams](#auto-install-for-team-projects)
  - [Cursor](#cursor)
  - [OpenAI Codex](#openai-codex)
  - [Manual (Any Agent)](#manual-installation-any-agent)
- [Tutorial: Your First Project](#tutorial-your-first-project)
  - [Step 1 — Bootstrap a Project](#step-1--bootstrap-a-project)
  - [Step 2 — Generate Your First Module](#step-2--generate-your-first-module)
  - [Step 3 — Add Access Control](#step-3--add-access-control)
  - [Step 4 — Add Business Logic](#step-4--add-business-logic)
  - [Step 5 — Review and Test](#step-5--review-and-test)
- [Commands Reference](#commands-reference)
- [Full Project from a Spec Document](#full-project-from-a-spec-document)
- [Diagnosing Issues](#diagnosing-issues)
- [What's Included](#whats-included)
- [Architecture](#architecture)
- [Agent Teams (Parallel Generation)](#agent-teams-parallel-generation)
- [Mandatory Engineering Rules](#mandatory-engineering-rules)
- [License](#license)

## What It Does

Instead of manually writing boilerplate for every NestJS module, this plugin gives your AI coding agent a complete toolkit:

- **Generate** full CRUD modules (entity, DTOs, service, controller, access control — 12+ files) from a simple JSON config
- **Orchestrate** entire projects from a requirements document, with dependency-aware wave-based generation
- **Review** code against 9 mandatory engineering rules automatically
- **Diagnose** runtime, build, and ACL errors with executable scripts
- **Bootstrap** new projects from the rockets-starter template

## Installation

### Claude Code (Plugin)

> Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI.

**1. Add the marketplace:**

```
/plugin marketplace add btwld/skills
```

**2. Install the plugin:**

```
/plugin install rockets-sdk-config@btwld
```

This registers all agents, commands, skills, and hooks in your Claude Code session.

**3. Verify it's installed:**

```
/plugin list
```

You should see `rockets-sdk-config@btwld` with 8 commands, 9 agents, and 7 skills listed.

**Uninstall:**

```
/plugin uninstall rockets-sdk-config@btwld
```

**Remove marketplace:**

```
/plugin marketplace remove btwld
```

The plugin auto-updates when you start a new session. To force a reinstall:

```
/plugin uninstall rockets-sdk-config@btwld
/plugin install rockets-sdk-config@btwld
```

### Auto-install for Team Projects

Add this to your project's `.claude/settings.json` so teammates are prompted to install automatically when they open the project:

```json
{
  "extraKnownMarketplaces": {
    "btwld": {
      "source": {
        "source": "github",
        "repo": "btwld/skills"
      }
    }
  },
  "enabledPlugins": {
    "rockets-sdk-config@btwld": true
  }
}
```

### Cursor

1. Clone the repo into your project (or a shared location):

```bash
git clone https://github.com/btwld/skills.git .rockets-skills
```

2. Add a `.cursorrules` file in your project root:

```
You are working on a Rockets SDK project (NestJS + TypeORM + Concepta).

Follow `.rockets-skills/CLAUDE.md` as the primary project contract.

Priority workflow:
1) Read the relevant file in `.rockets-skills/commands/`
2) Execute implementation using the matching `.rockets-skills/skills/`
3) Verify against `.rockets-skills/development-guides/`
4) Run diagnostics/tests when available

Hard rules:
- `@InjectRepository(...)` only in `*-typeorm-crud.adapter.ts`
- `@InjectDynamicRepository(...)` only in `*-model.service.ts` and `*-access-query.service.ts`
- Services outside model services must not inject repositories
- Access control defaults to deny
- New entity/module → ALWAYS use `rockets-crud-generator` skill, never copy-paste from guides
```

3. In Cursor Settings > Features, add the development guides as documentation context:

```
.rockets-skills/development-guides/ROCKETS_AI_INDEX.md
.rockets-skills/CLAUDE.md
```

4. Use the commands by referencing them in chat:

```
@.rockets-skills/commands/rockets-module.md generate a Category entity
```

### OpenAI Codex

1. Clone the repo into your project:

```bash
git clone https://github.com/btwld/skills.git .rockets-skills
```

2. Create or update your `AGENTS.md` (Codex reads this automatically):

```markdown
# Multi-Agent Workspace Guide

Follow `.rockets-skills/CLAUDE.md` as the canonical project contract.

## Workflow

1. Read `.rockets-skills/CLAUDE.md`
2. Route by `.rockets-skills/development-guides/ROCKETS_AI_INDEX.md`
3. Execute via `.rockets-skills/commands/` + `.rockets-skills/skills/`
4. Validate with diagnostics/tests

## Hard Rules

- CRUD modules → `rockets-crud-generator` skill (never copy-paste from guides)
- `@InjectRepository(...)` only in `*-typeorm-crud.adapter.ts`
- `@InjectDynamicRepository(...)` only in `*-model.service.ts` and `*-access-query.service.ts`
- Access control defaults to deny
```

3. When prompting Codex, reference the commands directly:

```
Read .rockets-skills/commands/rockets-module.md and generate a Category entity for my project.
```

### Manual Installation (Any Agent)

If you want to copy the files into your own structure:

```bash
git clone https://github.com/btwld/skills.git
cd skills

# Copy what you need
cp CLAUDE.md /your-project/          # Project contract (all agents read this)
cp AGENTS.md /your-project/          # Codex entrypoint
cp .cursorrules /your-project/       # Cursor entrypoint

# Copy agents, commands, skills, guides
cp -r agents/ /your-project/.rockets-skills/agents/
cp -r commands/ /your-project/.rockets-skills/commands/
cp -r skills/ /your-project/.rockets-skills/skills/
cp -r development-guides/ /your-project/.rockets-skills/development-guides/

# Copy hooks (Claude Code quality guardrails — only works with Claude Code)
cp hooks/hooks.json /your-project/.claude/settings.local.json
```

> Manual installation requires you to update manually when new versions are released. The Claude Code plugin method handles updates automatically.

---

## Tutorial: Your First Project

This walkthrough takes you from zero to a working Rockets API with CRUD, access control, and business logic.

### Step 1 — Bootstrap a Project

Start from the rockets-starter template:

**Claude Code:**

```
Ask Claude: "Bootstrap a new Rockets project at ../my-app"
```

Claude will run the bootstrap skill, which clones the starter, installs dependencies, and runs the initial build.

**CLI (direct):**

```bash
node skills/rockets-project-bootstrap/scripts/bootstrap.js \
  --repo git@github.com:btwld/rockets-starter.git \
  --dest ../my-app \
  --install --run-build
```

Then `cd ../my-app` and make sure the plugin is installed (see [Installation](#claude-code-plugin)).

### Step 2 — Generate Your First Module

Let's generate a `Category` entity with two fields.

**Claude Code:**

```
/rockets-module Category
```

Claude will ask you about fields, relations, and ACL. For a quick start:

```
Fields: name (string, required), description (text, optional)
Relations: none
ACL: Admin has full access
```

This generates 12+ files: entity, interfaces, DTOs, adapter, model service, CRUD service, controller, module, and access query service. It also wires the module into `app.module.ts`, registers the entity in `typeorm.settings.ts`, and adds ACL rules to `app.acl.ts`.

**Cursor / Codex:**

```
Read commands/rockets-module.md and generate a Category entity with fields: name (string, required), description (text, optional)
```

**CLI (direct):**

```bash
# Generate the module files
node skills/rockets-crud-generator/scripts/generate.js '{
  "entityName": "Category",
  "fields": [
    {"name": "name", "type": "string", "required": true},
    {"name": "description", "type": "text", "required": false}
  ]
}' > /tmp/category-output.json

# Integrate into your project (writes files + wires imports)
node skills/rockets-crud-generator/scripts/integrate.js \
  --input /tmp/category-output.json \
  --project /path/to/your/project

# Validate the generated code
node skills/rockets-crud-generator/scripts/validate.js \
  --project /path/to/your/project --build
```

### Step 3 — Add Access Control

Configure role-based access for the module:

**Claude Code:**

```
/rockets-acl Category
```

This sets up ACL rules. You can specify:
- Which roles (Admin, User, etc.) can access which operations (create, read, update, delete)
- Whether any role has **own-scope** access (users can only see/edit their own records)

**Cursor / Codex:**

```
Read commands/rockets-acl.md and configure ACL for Category — Admin has full access, User has read-only
```

### Step 4 — Add Business Logic

For entities that need more than CRUD (state machines, workflows, events):

**Claude Code:**

```
/rockets-business-logic
```

Describe what you need:
- "Category should have a status field with draft → published → archived transitions"
- "Send a notification when a Category is published"

**Cursor / Codex:**

```
Read commands/rockets-business-logic.md and add a status workflow to Category: draft → published → archived
```

### Step 5 — Review and Test

**Code review** against the 9 mandatory engineering rules:

```
/rockets-review
```

**Run tests** using the TDD guide:

```
/rockets-test CategoryModule
```

**Build and verify:**

```bash
yarn build
```

---

## Commands Reference

Slash commands are the primary interface for Claude Code. For Cursor/Codex, reference the command files directly (e.g., `commands/rockets-module.md`).

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/rockets-plan` | Plan a feature with architecture decisions | Before starting a new feature or major change |
| `/rockets-module` | Generate a CRUD module (12+ files) | When you need a new entity with full CRUD |
| `/rockets-acl` | Configure access control for an entity | After generating a module, to set role permissions |
| `/rockets-business-logic` | Add post-CRUD logic (state machines, workflows, events) | When an entity needs behavior beyond CRUD |
| `/rockets-from-doc` | Generate an entire project from a spec document | Starting a project from a PRD/RFC/spec |
| `/rockets-review` | Code review against SDK standards | Before merging, after generating modules |
| `/rockets-test` | TDD workflow for Rockets modules | When writing or verifying tests |
| `/rockets-build-fix` | Diagnose and fix build/runtime errors | When the build breaks or you get runtime errors |

## Full Project from a Spec Document

The most powerful workflow — go from a requirements document to a working project in one command:

**Claude Code:**

```
/rockets-from-doc docs/PRD.md
```

**What happens:**

1. Claude reads your spec and extracts all entities, fields, relations, and roles
2. Plans the generation order using topological sort (respecting entity dependencies)
3. Generates entities in waves — independent entities first, then those with relations
4. Wires everything into the project (modules, TypeORM, ACL)
5. Validates each wave before proceeding
6. Runs a final build + smoke test

**Cursor / Codex:**

```
Read commands/rockets-from-doc.md and generate the project from docs/PRD.md
```

**CLI (orchestrator for batch generation):**

```bash
node skills/rockets-orchestrator/scripts/orchestrate.js \
  --plan .rockets/plan.json \
  --project /path/to/your/project
```

## Diagnosing Issues

When things go wrong, use the diagnostic tools:

```bash
# Static diagnostics (no build required)
node skills/rockets-runtime-diagnostics/scripts/diagnose.js /path/to/project

# With build + test verification
node skills/rockets-runtime-diagnostics/scripts/diagnose.js /path/to/project --run-build --run-tests

# Smoke test all CRUD endpoints (starts the app, creates a user, tests each endpoint)
node skills/rockets-runtime-diagnostics/scripts/smoke-test-endpoints.js /path/to/project

# Validate generated code structure
node skills/rockets-crud-generator/scripts/validate.js --project /path/to/project --build
```

**Claude Code:**

```
/rockets-build-fix
```

Claude will read the error output, diagnose the issue, and fix it automatically.

---

## What's Included

### Commands (8)

| Command | File | Purpose |
|---------|------|---------|
| `/rockets-plan` | `commands/rockets-plan.md` | Plan a feature with architecture decisions |
| `/rockets-from-doc` | `commands/rockets-from-doc.md` | Generate an entire project from a requirements document |
| `/rockets-module` | `commands/rockets-module.md` | Generate a CRUD module (entity, DTOs, service, controller, ACL) |
| `/rockets-acl` | `commands/rockets-acl.md` | Configure access control for an entity |
| `/rockets-business-logic` | `commands/rockets-business-logic.md` | Implement post-CRUD business logic (state machines, workflows, events) |
| `/rockets-review` | `commands/rockets-review.md` | Code review against Rockets SDK standards |
| `/rockets-test` | `commands/rockets-test.md` | TDD workflow for Rockets modules |
| `/rockets-build-fix` | `commands/rockets-build-fix.md` | Diagnose and fix build/runtime errors |

### Agents (9)

Agents are AI role specs invoked by commands. You typically don't call these directly.

| Agent | Role |
|-------|------|
| `rockets-planner` | Plans features using the 12-file module pattern |
| `rockets-architect` | System design, Concepta package selection |
| `rockets-module-generator` | Generates complete modules via scripts |
| `rockets-code-reviewer` | Reviews code against Rockets patterns |
| `rockets-auto-reviewer` | Lightweight automated review (runs on Haiku for speed) |
| `rockets-security-reviewer` | Audits ACL, guards, and auth configuration |
| `rockets-build-resolver` | Diagnoses and fixes build errors |
| `rockets-tdd-guide` | Guides TDD for Rockets projects |
| `rockets-custom-endpoints` | *(Deprecated)* — Use `rockets-business-logic` skill instead |

### Skills (8)

Skills are executable tools with scripts. They work with any agent — Claude, Cursor, or Codex can run the scripts directly.

| Skill | Purpose | Key Script |
|-------|---------|------------|
| `rockets-crud-generator` | Generates module files from JSON config | `scripts/generate.js` |
| `rockets-orchestrator` | Batch-generates entities with topological sorting | `scripts/orchestrate.js` |
| `rockets-access-control` | Configures ACL rules and ownership enforcement | (guide-driven) |
| `rockets-business-logic` | State machines, workflows, events, notifications | (guide-driven) |
| `rockets-custom-code` | Rules for non-CRUD logic with correct service boundaries | (guide-driven) |
| `rockets-runtime-diagnostics` | Executable diagnostics for runtime/build/ACL errors | `scripts/diagnose.js` |
| `rockets-project-bootstrap` | Bootstraps a new Rockets project | `scripts/bootstrap.js` |
| `rockets-testing-patterns` | *(Deprecated)* — Use `rockets-tdd-guide` agent instead | — |

### Hooks (Quality Guardrails)

Hooks run automatically in Claude Code to enforce standards. For Cursor/Codex, the rules are enforced via `CLAUDE.md` and agent instructions.

**Pre-tool hooks** (block bad patterns before they happen):

| Hook | What It Blocks |
|------|---------------|
| Block random docs | Prevents creating unnecessary `.md`/`.txt` files |
| Block destructive git | Stops `git push --force`, `reset --hard`, `clean -f`, etc. |
| Block ACL workarounds | Prevents incorrect ACL provider registration in feature modules |
| Block `@InjectRepository` | Ensures `@InjectRepository` is only used in adapter files |

**Post-tool hooks** (reminders after changes):

| Hook | What It Reminds |
|------|----------------|
| TypeScript reminder | Run `yarn build` after `.ts` edits |
| ACL security check | Verify role permissions after `app.acl.ts` changes |
| Access query check | Verify ownership checks after access query service changes |
| State machine check | Verify transition maps after status service changes |
| Workflow check | Verify model service usage after workflow service changes |
| Post-integration | Run `validate.js` after `integrate.js` |

### Development Guides (12)

Reference documentation for Rockets SDK patterns. Point your agent to the relevant guide.

| Guide | Topic |
|-------|-------|
| `ROCKETS_AI_INDEX.md` | Index of all guides (start here) |
| `CRUD_PATTERNS_GUIDE.md` | CRUD module structure and patterns |
| `ACCESS_CONTROL_GUIDE.md` | ACL configuration and access query services |
| `DTO_PATTERNS_GUIDE.md` | DTO design and validation |
| `CONFIGURATION_GUIDE.md` | Module configuration and factories |
| `TESTING_GUIDE.md` | Testing strategies and patterns |
| `BUSINESS_LOGIC_PATTERNS_GUIDE.md` | State machines, workflows, events |
| `ADVANCED_PATTERNS_GUIDE.md` | Advanced architectural patterns |
| `ADVANCED_ENTITIES_GUIDE.md` | Entity inheritance and relations |
| `SDK_SERVICES_GUIDE.md` | Concepta SDK service reference |
| `ROCKETS_PACKAGES_GUIDE.md` | Rockets package reference |
| `CONCEPTA_PACKAGES_GUIDE.md` | Concepta package reference |

---

## Architecture

This plugin follows a **command-first** architecture:

```
User → Command → Agent → Skill → Generated Code
         ↑                  ↑
         └── guides ────────┘  (reference patterns)
```

- **Commands** are the entrypoint — users invoke these via slash commands (Claude Code) or file references (Cursor/Codex)
- **Agents** are AI role specs that commands delegate to
- **Skills** are executable generators and tools that agents call
- **Guides** are reference documentation that agents and skills consult
- **Hooks** are guardrails that run automatically (Claude Code only)

### How Each Agent Reads the Plugin

| Agent | Entrypoint | What It Reads |
|-------|-----------|---------------|
| Claude Code | `CLAUDE.md` + plugin install | All files automatically via plugin registration |
| Cursor | `.cursorrules` | Files you reference with `@` or add to context |
| Codex | `AGENTS.md` | Files you reference in prompts or that it discovers via AGENTS.md |

## Agent Teams (Parallel Generation)

For large projects (3+ entities), Claude Code can auto-form agent teams for parallel generation:

| Role | Model | Responsibility |
|------|-------|---------------|
| Lead | Opus | Parses spec, creates tasks, coordinates waves |
| Generator | Sonnet | Runs `generate.js` + `integrate.js` per entity |
| Reviewer | Haiku | Validates against 9 engineering rules |
| Tester | Sonnet | Runs `validate.js` + smoke tests |
| Builder | Sonnet | Fixes build errors (max 3 retries) |

Enable with `.claude/settings.json` in your project:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> Agent Teams is a Claude Code feature. Cursor and Codex use sequential execution.

## Mandatory Engineering Rules

These rules are enforced by the plugin (via hooks, agents, and validation scripts):

1. CRUD modules **must** be generated first (`rockets-crud-generator`) before manual edits
2. `@InjectRepository(...)` is only allowed in `*-typeorm-crud.adapter.ts`
3. `@InjectDynamicRepository(...)` is only allowed in `*-model.service.ts` and `*-access-query.service.ts`
4. Non-model services must consume model services, never repositories directly
5. Access query services must be fail-secure (default deny)
6. Own-scope permissions must enforce ownership in query/service logic, not only in ACL grants
7. State machine services must enforce transition maps — no direct status updates
8. Workflow services use model services for entity access (except `DataSource.transaction()`)
9. Notification services must create audit records before dispatching

## License

MIT
