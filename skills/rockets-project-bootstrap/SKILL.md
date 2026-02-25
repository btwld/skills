---
name: rockets-project-bootstrap
description: Bootstrap a Rockets project from boilerplate with executable setup steps (clone, env, install, build/test checks). Use when starting a new Rockets project from rockets-starter or similar templates.
---

# Rockets Project Bootstrap

Use this skill to start a new Rockets project with deterministic setup commands.

Default template repository:

`git@github.com:btwld/rockets-starter.git`

## Commands

```bash
# Full bootstrap (clone + env + install + build/test)
node skills/rockets-project-bootstrap/scripts/bootstrap.js \
  --repo git@github.com:btwld/rockets-starter.git \
  --dest ../rockets-starter-app \
  --install --run-build --run-test

# Bootstrap existing local folder (skip clone)
node skills/rockets-project-bootstrap/scripts/bootstrap.js \
  --skip-clone \
  --dest /path/to/existing/project \
  --install --run-build --run-test

# Dry run
node skills/rockets-project-bootstrap/scripts/bootstrap.js --dest ../rockets-starter-app --dry-run
```

## What it does

1. Clone boilerplate repository (unless `--skip-clone`).
2. Ensure `.env` exists (copies from `.env.example` when available).
3. Detect package manager (`yarn`/`pnpm`/`npm`) from lockfile.
4. Install dependencies when `--install` is provided.
5. Run `build` and `test` scripts when requested and available.
6. Print summary with pass/fail and next steps.

## Smoke test

```bash
node skills/rockets-project-bootstrap/scripts/smoke-test.js
```

The smoke test validates setup logic on a local temporary fixture (no network).
