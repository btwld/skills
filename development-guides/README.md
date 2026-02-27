# Development Guides (canonical)

Source of truth for **Rockets SDK** and **Concepta** patterns. Skills and commands in this repo reference these guides. For AI: start with [ROCKETS_AI_INDEX.md](./ROCKETS_AI_INDEX.md), then open the guide for your task.

## Guide index

| Guide | Purpose | Size |
|-------|---------|------|
| [ROCKETS_AI_INDEX.md](./ROCKETS_AI_INDEX.md) | Navigation hub — start here | Small |
| [CRUD_PATTERNS_GUIDE.md](./CRUD_PATTERNS_GUIDE.md) | CRUD services, controllers, adapters, quality checklist | Medium |
| [ACCESS_CONTROL_GUIDE.md](./ACCESS_CONTROL_GUIDE.md) | ACL setup, roles, resources, Access Query Services, ownership | Medium |
| [DTO_PATTERNS_GUIDE.md](./DTO_PATTERNS_GUIDE.md) | DTO creation, validation, PickType patterns | Small |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Unit, E2E, fixtures, AAA pattern | Large |
| [ROCKETS_PACKAGES_GUIDE.md](./ROCKETS_PACKAGES_GUIDE.md) | Package selection (@bitwild/rockets vs @bitwild/rockets-auth) | Medium |
| [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md) | App bootstrap, module config, env vars | Medium |
| [CONCEPTA_PACKAGES_GUIDE.md](./CONCEPTA_PACKAGES_GUIDE.md) | @concepta ecosystem integration | Medium |
| [ADVANCED_PATTERNS_GUIDE.md](./ADVANCED_PATTERNS_GUIDE.md) | ConfigurableModuleBuilder, provider factories | Medium |
| [SDK_SERVICES_GUIDE.md](./SDK_SERVICES_GUIDE.md) | Service extension vs implementation patterns | Medium |
| [ADVANCED_ENTITIES_GUIDE.md](./ADVANCED_ENTITIES_GUIDE.md) | Complex relationships, views, inheritance | Medium |
| [AUTHENTICATION_ADVANCED_GUIDE.md](./AUTHENTICATION_ADVANCED_GUIDE.md) | Custom auth providers, strategies, guards, MFA | Medium |
| [AI_PLUGINS_AND_MCP.md](./AI_PLUGINS_AND_MCP.md) | Recommended MCPs and Claude Code plugins (Context7, Frontend Design, Code Review) | Small |

## Use in your project

- **Clone this repo** and copy `development-guides/` into your Rockets project, or
- **Install the plugin** (`/plugin install btwld/skills`) — agents and commands use these guides from the plugin context when available.
