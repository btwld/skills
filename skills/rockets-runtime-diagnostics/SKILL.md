---
name: rockets-runtime-diagnostics
description: Diagnose common Rockets SDK startup/build/security wiring issues with executable checks and fix-ready output. Use when an app fails to boot, build, or enforce ACL as expected.
---

# Rockets Runtime Diagnostics

Use this skill to diagnose real runtime/build problems in Rockets projects, not just read guides.

## What this skill does

1. Runs static diagnostics for known Rockets failure patterns.
2. Optionally runs `build` and `test` commands.
3. Reports root cause, evidence, and exact next commands.

## Commands

```bash
# Diagnose project in current directory
node skills/rockets-runtime-diagnostics/scripts/diagnose.js .

# Diagnose another project
node skills/rockets-runtime-diagnostics/scripts/diagnose.js /path/to/project

# Include build and tests
node skills/rockets-runtime-diagnostics/scripts/diagnose.js . --run-build --run-tests

# Machine-readable output
node skills/rockets-runtime-diagnostics/scripts/diagnose.js . --json
```

## Checks implemented

- `ROCKETS_AUTH_IMPORT_ORDER`: `RocketsAuthModule` must appear before `RocketsModule`/`RocketsServerModule`.
- `ROCKETS_MODULE_NOT_REGISTERED`: package installed but module not registered in `app.module.ts`.
- `DYNAMIC_USER_METADATA_TOKEN_MISSING`: `userMetadata` configured without `TypeOrmExtModule.forFeature({ userMetadata: ... })`.
- `ACL_RESOURCE_LITERAL_NOT_IN_ENUM`: literal resource in decorators missing in `AppResource` enum.
- `ACCESS_QUERY_SERVICE_MISSING`: module has CRUD controller but no `*-access-query.service.ts`.

## Typical workflow

1. Run diagnostics script.
2. Fix issues by severity: CRITICAL -> HIGH -> MEDIUM.
3. Re-run diagnostics until no CRITICAL/HIGH issues remain.
4. Run `yarn build` and then targeted tests.

## Endpoint Smoke Test

Tests live CRUD endpoints against a running NestJS app:

```bash
# Basic usage
node skills/rockets-runtime-diagnostics/scripts/smoke-test-endpoints.js --project ./apps/api

# Custom port + longer timeout
node skills/rockets-runtime-diagnostics/scripts/smoke-test-endpoints.js --project ./apps/api --port 4000 --timeout 60000

# Without auth (public endpoints only)
node skills/rockets-runtime-diagnostics/scripts/smoke-test-endpoints.js --project ./apps/api --no-auth

# Keep server running after tests
node skills/rockets-runtime-diagnostics/scripts/smoke-test-endpoints.js --project ./apps/api --keep
```

What it does:
1. Discovers CRUD modules by scanning `src/modules/*/\*.crud.controller.ts`
2. Starts the NestJS app (`yarn start` or `npm start`)
3. Waits for server readiness
4. Signs up a test user + logs in to get JWT
5. For each module: tests CREATE, READ MANY, READ ONE, UPDATE, DELETE
6. Kills the app and outputs a JSON report

Output: `{ passed, summary: { total, passed, failed, modules }, auth, modules }`

## Diagnostics Smoke Test

```bash
node skills/rockets-runtime-diagnostics/scripts/smoke-test.js
```

This validates the diagnostic engine against fixture projects with known errors.
