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

## Template Contract

The starter template **must** be correct out of the box. The generators add to it — they never fix it.
Run `validate.js --project <path>` after bootstrap to verify compliance.

### Required Structure

```
apps/api/src/
├── main.ts                              # Swagger with project-specific title
├── app.module.ts                        # RocketsAuthModule + CrudModule.forRoot({})
├── app.acl.ts                           # AppRole + AppResource enums, base grants
├── access-control.service.ts            # Implements AccessControlServiceInterface
├── config/
│   ├── typeorm.settings.ts              # Postgres config, entities array
│   ├── rockets-auth.settings.ts         # Auth config, project-specific email
│   └── rockets.settings.ts              # App config
├── entities/
│   ├── index.ts                         # Barrel export for all entities
│   ├── user.entity.ts                   # extends UserPostgresEntity
│   ├── role.entity.ts                   # extends RolePostgresEntity
│   ├── user-otp.entity.ts              # extends OtpPostgresEntity or CommonPostgresEntity
│   ├── user-metadata.entity.ts          # extends CommonPostgresEntity
│   ├── user-role.entity.ts              # extends CommonPostgresEntity
│   ├── federated.entity.ts              # extends FederatedPostgresEntity or CommonPostgresEntity
│   └── invitation.entity.ts             # extends InvitationPostgresEntity or CommonPostgresEntity
├── adapters/
│   ├── user.adapter.ts                  # @InjectRepository(UserEntity)
│   └── user-metadata.adapter.ts         # @InjectRepository(UserMetadataEntity)
├── modules/
│   ├── user/dto/                        # User DTOs (used by RocketsAuthModule)
│   └── role/                            # Role CRUD (adapter, DTO)
└── migrations/                          # Initial migration for all auth tables
```

### Mandatory Rules

1. **Postgres only** — All entities MUST extend `*PostgresEntity` or `CommonPostgresEntity`. NO `*SqliteEntity` base classes anywhere.
2. **Single entity definition** — Each entity defined ONCE in `src/entities/`. NO duplicate entity files in `modules/*/entities/`.
3. **Project-specific values** — `main.ts` Swagger title, `typeorm.settings.ts` DB name, `rockets-auth.settings.ts` email MUST match the project name. NO placeholder names from other projects.
4. **No stale comments** — NO references to other projects (PetAccessQueryService, Music Management, etc.).
5. **CrudModule.forRoot({})** — MUST be in `app.module.ts` imports (required before any `CrudModule.forFeature()`).
6. **Complete migrations** — Initial migration MUST create all auth entity tables with Postgres types (`uuid`, `timestamp`, NOT `datetime`).
7. **`.env.example`** — MUST exist with all required environment variables documented.

### What the Generators Expect

The generators (`generate.js` + `integrate.js`) assume:
- `src/entities/index.ts` exists (adds exports)
- `src/config/typeorm.settings.ts` or `src/typeorm.settings.ts` has an `entities: [...]` array
- `src/app.module.ts` has `@Module({ imports: [...] })` with bracket structure
- `src/app.acl.ts` has `AppResource` enum and `acRules` variable (if using ACL)

If any of these are missing or malformed, `integrate.js` will warn but not fail.

## Smoke test

```bash
node skills/rockets-project-bootstrap/scripts/smoke-test.js
```

The smoke test validates setup logic on a local temporary fixture (no network).
