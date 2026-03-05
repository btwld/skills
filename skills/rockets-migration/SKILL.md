---
name: rockets-migration
description: Generate and manage TypeORM database migrations for Rockets SDK projects. Use after CRUD modules are generated to create migration files, run them, and keep schema in sync.
---

# Rockets Migration Skill

Covers TypeORM migration generation, execution, and rollback for Rockets SDK projects.

> Always run migrations AFTER CRUD generation (entities must exist). Never edit entity files after running a migration without generating a new one.

## When to Use

- After `rockets-crud-generator` runs (new entities need migration files)
- After adding a field to an existing entity
- Before deploying to staging or production
- When `synchronize: true` needs to be disabled (production requirement)

## Prerequisites

The target project must have:
- `data-source.ts` (TypeORM DataSource for CLI use) OR `typeorm.settings.ts` exportable config
- `typeorm` in `package.json`
- `ts-node` available (for TypeScript migration files)

## Step 1: Ensure CLI DataSource exists

TypeORM CLI needs a dedicated DataSource export (separate from NestJS module init).

File: `src/data-source.ts`

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
```

Check `package.json` for a `typeorm` script. If missing, add:
```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d src/data-source.ts"
  }
}
```

## Step 2: Generate migration

```bash
# After CRUD entities are created:
npm run typeorm migration:generate -- src/migrations/InitialMigration

# After adding a field to an existing entity:
npm run typeorm migration:generate -- src/migrations/AddStatusToTask
```

Naming convention: `src/migrations/<timestamp>-<DescriptiveName>.ts`

TypeORM prepends the timestamp automatically.

## Step 3: Run migrations

```bash
npm run typeorm migration:run
```

Verify: check `migrations` table in the database to confirm it ran.

## Step 4: Rollback (if needed)

```bash
npm run typeorm migration:revert
```

## Checklist

- [ ] `src/data-source.ts` exists with correct entity glob
- [ ] `typeorm` script in `package.json`
- [ ] `synchronize: false` in production DataSource
- [ ] Migration file generated with descriptive name
- [ ] Migration reviewed (check UP and DOWN methods)
- [ ] Migration runs without error: `migration:run`
- [ ] Migration listed in `migrations` DB table

## Integration with rockets-from-doc

In `/rockets-from-doc`, migrations run as Step 3b automatically after CRUD generation:
```bash
npm run typeorm migration:generate -- src/migrations/InitialSchema
npm run typeorm migration:run
```

If migration:generate fails (DataSource not configured), set up `src/data-source.ts` first.

## References

- `development-guides/CRUD_PATTERNS_GUIDE.md` — entity structure (migration must match)
- `skills/rockets-crud-generator/SKILL.md` — CRUD generation (run before migration)
