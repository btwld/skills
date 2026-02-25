# AI Plugins & MCP Setup

Recommended MCPs and plugins to use with Claude Code or Cursor so the AI has up-to-date context and better output. Use this guide when setting up a new machine or onboarding to the project.

## MCP (Model Context Protocol)

| Tool | Purpose | Link |
|------|---------|------|
| **Context7** | Up-to-date documentation for LLMs and AI editors. Pull version-specific docs and code examples from source repos into context (e.g. NestJS, Next.js, TypeORM). | [context7.com](https://context7.com/) |

Add Context7 as an MCP server in your editor so the model can fetch framework docs by version instead of relying only on training data.

## Claude Code Plugins

| Plugin | Purpose | Link |
|--------|---------|------|
| **Frontend Design** | Production-grade frontends with distinct design; avoids generic AI aesthetics (typography, motion, layout). Use when building UI in `apps/web`. | [Claude – Frontend Design](https://claude.com/plugins/frontend-design) |
| **Code Review** | AI code review with specialized agents and confidence-based filtering for pull requests. | [Claude – Code Review](https://claude.com/plugins/code-review) |
| **GitHub** | Official GitHub MCP: issues, PRs, repo search. Useful for PR workflows and linking code to issues. | Via Claude Code plugin marketplace |

## Strategy

- **Backend / API (`apps/api`)**: Use this repo’s `development-guides/` and `CLAUDE.md` as the source of truth. Use **Context7** when the model needs official, versioned reference (NestJS, TypeORM, etc.).
- **Frontend (`apps/web`)**: Use the **Frontend Design** plugin when generating or refining UI so output is production-grade and on-brand instead of generic.
- **Code review / PRs**: Use the **Code Review** plugin (and optional GitHub MCP) for consistent, rule-aware reviews (e.g. model service usage, no direct repository injection, no hardcoded email templates).

**Suggested order**: Start with **Context7** for docs and **Frontend Design** for UI; add Code Review and GitHub when you standardize on AI-assisted PRs.
