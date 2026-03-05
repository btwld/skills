---
name: rockets-seeder
description: Generate data seeders for Rockets SDK projects. Creates roles, admin users, and sample entity records. Use after migrations to populate the database with required initial data and dev fixtures.
---

# Rockets Seeder Skill

Covers seeder patterns for Rockets SDK projects using NestJS + TypeORM.

> Seeders run AFTER migrations. They should be idempotent — safe to run multiple times without creating duplicates.

## When to Use

- After migrations to populate initial roles and admin user
- To create lookup/reference data required for the app to function
- To create dev/staging sample data for testing
- When the spec lists default roles, plans, categories, or other reference data

## Architecture

NestJS CLI application that bootstraps the full app context and runs seeder services sequentially.

Files to create:
- `src/database/seeder.ts` — CLI entrypoint (NestFactory.createApplicationContext)
- `src/database/seeder.module.ts` — imports AppModule + all seeder providers
- `src/database/database.seeder.ts` — orchestrates seeders in order (roles first, then users)
- `src/database/seeders/role.seeder.ts` — idempotent role creation
- `src/database/seeders/user.seeder.ts` — admin user from env vars
- `src/database/seeders/{entity}.seeder.ts` — one per entity with sample data

Read `references/templates.md` for complete TypeScript templates for each file.

## Package.json Script

Add to `package.json`:
```json
{
  "scripts": {
    "seed": "ts-node -r tsconfig-paths/register src/database/seeder.ts"
  }
}
```

## Checklist

- [ ] `src/database/seeder.ts` CLI entrypoint created
- [ ] `SeederModule` imports `AppModule` (to access all model services)
- [ ] Role seeder creates all roles from spec (idempotent)
- [ ] Admin user seeder reads credentials from env vars
- [ ] Entity seeders created for lookup/reference data
- [ ] All seeders use model services — no direct repository injection (Rule 4)
- [ ] `seed` script added to `package.json`
- [ ] Seeder runs without error: `npm run seed`
- [ ] Running twice produces no duplicates

## Integration with rockets-from-doc

In `/rockets-from-doc`, seeder runs as Step 3c after migrations:
```bash
npm run seed
```

## References

- `skills/rockets-migration/SKILL.md` — run migrations before seeding
- `development-guides/SDK_SERVICES_GUIDE.md` — model service injection rules
- `CLAUDE.md` Rule 4 — no direct repository in non-adapter services
- `references/templates.md` — complete TypeScript templates for all seeder files
