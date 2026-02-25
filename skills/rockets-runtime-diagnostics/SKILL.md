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

## Smoke test for this skill

```bash
node skills/rockets-runtime-diagnostics/scripts/smoke-test.js
```

This validates the diagnostic engine against fixture projects with known errors.
