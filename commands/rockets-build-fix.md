---
description: Incrementally fix TypeScript, NestJS, and TypeORM build errors in Rockets SDK projects. Fixes one error at a time and re-checks.
---

# Rockets Build Fix Command

Invokes the **rockets-build-resolver** agent to fix build errors.

## What This Command Does

1. Run `yarn build` to capture errors
2. Group errors by file and root cause
3. Fix one error at a time
4. Re-run build after each fix
5. Report summary of fixes

## Source of Truth

- `CLAUDE.md`
- `skills/rockets-runtime-diagnostics/SKILL.md`

## Safety Rules

- Fix ONE error at a time
- Re-run build after each fix
- Stop after 3 failed attempts on same error
- Never delete test files
- Never add `any` types or `@ts-ignore`
