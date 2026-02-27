# Rockets SDK Skills

A plugin that supercharges [Rockets SDK](https://github.com/btwld/rockets-starter) development with AI-powered code generation, review, diagnostics, and orchestration for NestJS + TypeORM + Concepta projects.

Works with **Claude Code**, **Cursor**, and **OpenAI Codex**.

## What It Does

Instead of manually writing boilerplate for every NestJS module, this plugin gives your AI coding agent a complete toolkit:

- **Generate** full CRUD modules (entity, DTOs, service, controller, access control — 12+ files) from a simple JSON config
- **Orchestrate** entire projects from a requirements document, with dependency-aware wave-based generation
- **Review** code against 9 mandatory engineering rules automatically
- **Diagnose** runtime, build, and ACL errors with executable scripts
- **Bootstrap** new projects from the rockets-starter template

## Installation

### Claude Code (Recommended)

**Step 1:** Add the marketplace:

```
/plugin marketplace add btwld/skills
```

**Step 2:** Install the plugin:

```
/plugin install rockets-sdk-config@btwld
```

This registers all agents, commands, skills, and hooks in your Claude Code session.

**Verify** it's installed:

```
/plugin list
```

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

#### Auto-install for team projects

Add this to your project's `.claude/settings.json` so teammates are prompted to install automatically:

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

2. Add a `.cursorrules` file in your project root that points to the skills:

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

4. For the generator scripts, Codex can run them directly:

```bash
# Generate a module
node .rockets-skills/skills/rockets-crud-generator/scripts/generate.js '{"entityName":"Category","fields":[{"name":"name","type":"string","required":true}]}'

# Integrate into project
node .rockets-skills/skills/rockets-crud-generator/scripts/integrate.js --input output.json --project .

# Validate
node .rockets-skills/skills/rockets-crud-generator/scripts/validate.js --project . --build
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

# Copy agents (AI role behaviors)
cp -r agents/ /your-project/.rockets-skills/agents/

# Copy commands (slash command playbooks)
cp -r commands/ /your-project/.rockets-skills/commands/

# Copy skills (executable generators and tools)
cp -r skills/ /your-project/.rockets-skills/skills/

# Copy development guides (reference docs)
cp -r development-guides/ /your-project/.rockets-skills/development-guides/

# Copy hooks (Claude Code quality guardrails — only works with Claude Code)
cp hooks/hooks.json /your-project/.claude/settings.local.json
```

> **Note:** Manual installation requires you to update manually when new versions are released. The Claude Code plugin method handles updates automatically.

## Quick Start

### 1. Set Up a New Project

```bash
# Bootstrap from rockets-starter template
node skills/rockets-project-bootstrap/scripts/bootstrap.js \
  --repo git@github.com:btwld/rockets-starter.git \
  --dest ../my-rockets-app \
  --install --run-build --run-test
```

### 2. Generate a Module

**Claude Code** (slash commands):

```
/rockets-module Category
```

**Cursor / Codex** (reference the command file):

```
Read commands/rockets-module.md and generate a Category entity with fields: name (string, required), description (text, optional)
```

**CLI** (direct script execution):

```bash
# Step 1: Generate files
node skills/rockets-crud-generator/scripts/generate.js '{
  "entityName": "Category",
  "fields": [
    {"name": "name", "type": "string", "required": true},
    {"name": "description", "type": "text", "required": false}
  ]
}' > /tmp/category-output.json

# Step 2: Write files + wire into project
node skills/rockets-crud-generator/scripts/integrate.js \
  --input /tmp/category-output.json \
  --project /path/to/your/project

# Step 3: Validate
node skills/rockets-crud-generator/scripts/validate.js \
  --project /path/to/your/project --build
```

### 3. Generate Full Project from Spec

**Claude Code:**

```
/rockets-from-doc
```

**Cursor / Codex:**

```
Read commands/rockets-from-doc.md and generate the project from my PRD document at docs/PRD.md
```

**CLI** (orchestrator for batch generation):

```bash
node skills/rockets-orchestrator/scripts/orchestrate.js \
  --plan .rockets/plan.json \
  --project /path/to/your/project
```

### 4. Follow the Workflow

```
/rockets-plan    → Plan the feature
/rockets-module  → Generate CRUD module
/rockets-acl     → Configure access control
/rockets-test    → Run TDD workflow
/rockets-review  → Code review against SDK standards
```

## What's Included

### Commands (8)

Slash commands are the primary interface for Claude Code. For Cursor and Codex, reference the command files directly.

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

### Agents (8)

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

### Skills (7)

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

### Hooks (Quality Guardrails)

Hooks run automatically in Claude Code to enforce standards. For Cursor/Codex, the rules are enforced via `CLAUDE.md` and agent instructions.

| Hook | When | What It Does |
|------|------|-------------|
| Block random docs | Before writing `.md` files | Prevents unnecessary documentation files |
| Block destructive git | Before `git push --force`, `reset --hard`, etc. | Protects against accidental data loss |
| Block ACL workarounds | Before editing `.module.ts` | Prevents incorrect ACL provider registration |
| Block `@InjectRepository` | Before editing services/controllers | Ensures repositories are only injected in adapter files |
| TypeScript reminder | After editing `.ts` files | Reminds to run build verification |
| ACL security check | After editing `app.acl.ts` | Alerts to verify role permissions |
| Access query check | After editing access query services | Alerts to verify ownership checks |
| State machine check | After editing status services | Reminds to verify transition maps |
| Workflow check | After editing workflow services | Reminds to verify model service usage |
| Post-integration check | After running `integrate.js` | Reminds to run validation |

### Development Guides (12)

Reference documentation for Rockets SDK patterns. These work with any AI agent — point your agent to the relevant guide.

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

### Agent Teams (Parallel Generation)

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

## Using with rockets-starter

### Claude Code

```bash
# 1. Bootstrap project
node skills/rockets-project-bootstrap/scripts/bootstrap.js \
  --repo git@github.com:btwld/rockets-starter.git \
  --dest ../my-app --install

# 2. Install plugin (inside Claude Code)
/plugin marketplace add btwld/skills
/plugin install rockets-sdk-config@btwld

# 3. Generate from spec
/rockets-from-doc
```

### Cursor

```bash
# 1. Clone starter + skills
git clone git@github.com:btwld/rockets-starter.git my-app
cd my-app
git clone https://github.com/btwld/skills.git .rockets-skills

# 2. Add .cursorrules (see Installation section above)

# 3. Open in Cursor, then in chat:
@.rockets-skills/commands/rockets-from-doc.md generate the project from @docs/PRD.md
```

### Codex

```bash
# 1. Clone starter + skills
git clone git@github.com:btwld/rockets-starter.git my-app
cd my-app
git clone https://github.com/btwld/skills.git .rockets-skills

# 2. Add AGENTS.md (see Installation section above)

# 3. Prompt Codex:
Read .rockets-skills/commands/rockets-from-doc.md and generate the project from docs/PRD.md
```

## Recommended Workflow

### New Project (End-to-End)

```
1. Bootstrap project  →  rockets-project-bootstrap skill
2. Provide spec doc   →  /rockets-from-doc (or reference commands/rockets-from-doc.md)
   (generates all entities, ACL, validation in dependency order)
3. Add business logic →  /rockets-business-logic
4. Review             →  /rockets-review
```

### Single Feature

```
1. Plan       →  /rockets-plan <Feature>
2. Generate   →  /rockets-module <Entity>
3. ACL        →  /rockets-acl <Entity>
4. Test       →  /rockets-test <EntityModule>
5. Review     →  /rockets-review
```

### Diagnose Issues

```bash
# Static diagnostics
node skills/rockets-runtime-diagnostics/scripts/diagnose.js /path/to/project

# With build + test verification
node skills/rockets-runtime-diagnostics/scripts/diagnose.js /path/to/project --run-build --run-tests

# Smoke test all CRUD endpoints
node skills/rockets-runtime-diagnostics/scripts/smoke-test-endpoints.js /path/to/project

# Validate generated code structure
node skills/rockets-crud-generator/scripts/validate.js --project /path/to/project --build
```

## License

MIT
