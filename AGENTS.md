# Multi-Agent Workspace Guide

Follow `CLAUDE.md` as the canonical project contract.

## Workflow

1. Read `CLAUDE.md`
2. Route by `development-guides/ROCKETS_AI_INDEX.md`
3. Execute via `commands/` + `skills/`
4. Validate with diagnostics/tests

## Hard Rules

- CRUD modules → `rockets-crud-generator` skill (never copy-paste from guides)
- `@InjectRepository(...)` only in `*-typeorm-crud.adapter.ts`
- `@InjectDynamicRepository(...)` only in `*-model.service.ts`
- Access control defaults to deny
