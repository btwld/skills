# Seeder Templates

> Reference file — load when implementing seeders for a Rockets project.
> All seeders MUST use model services, never direct repositories (Rule 4).

## Seeder Architecture

Use a NestJS CLI application that bootstraps the app context and runs seeder services.

### File: `src/database/seeder.ts` (CLI entrypoint)

```typescript
import { NestFactory } from '@nestjs/core';
import { SeederModule } from './seeder.module';
import { DatabaseSeeder } from './database.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeederModule);
  const seeder = app.get(DatabaseSeeder);
  await seeder.seed();
  await app.close();
}
bootstrap().catch(console.error);
```

### File: `src/database/seeder.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppModule } from '../app.module';
import { DatabaseSeeder } from './database.seeder';
import { RoleSeeder } from './seeders/role.seeder';
import { UserSeeder } from './seeders/user.seeder';
// import entity seeders as needed

@Module({
  imports: [AppModule],
  providers: [DatabaseSeeder, RoleSeeder, UserSeeder],
})
export class SeederModule {}
```

### File: `src/database/database.seeder.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { RoleSeeder } from './seeders/role.seeder';
import { UserSeeder } from './seeders/user.seeder';

@Injectable()
export class DatabaseSeeder {
  constructor(
    private readonly roleSeeder: RoleSeeder,
    private readonly userSeeder: UserSeeder,
  ) {}

  async seed(): Promise<void> {
    console.log('Seeding...');
    await this.roleSeeder.seed();  // roles first
    await this.userSeeder.seed();  // then admin user
    console.log('Done.');
  }
}
```

## Standard Seeders

### Role Seeder (`src/database/seeders/role.seeder.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { RoleModelService } from '@concepta/nestjs-role';

@Injectable()
export class RoleSeeder {
  constructor(private readonly roleModelService: RoleModelService) {}

  async seed(): Promise<void> {
    const roles = ['admin', 'user']; // from spec roles
    for (const name of roles) {
      const exists = await this.roleModelService.findOne({ where: { name } });
      if (!exists) {
        await this.roleModelService.create({ name });
        console.log(`Created role: ${name}`);
      }
    }
  }
}
```

### User Seeder (`src/database/seeders/user.seeder.ts`)

Uses model services — never direct repositories.

```typescript
import { Injectable } from '@nestjs/common';
import { UserModelService } from '...';

@Injectable()
export class UserSeeder {
  constructor(private readonly userModelService: UserModelService) {}

  async seed(): Promise<void> {
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
    const exists = await this.userModelService.findOne({ where: { email: adminEmail } });
    if (!exists) {
      await this.userModelService.create({
        email: adminEmail,
        username: 'admin',
        password: process.env.SEED_ADMIN_PASSWORD || 'admin123!',
        active: true,
      });
      console.log(`Created admin: ${adminEmail}`);
    }
  }
}
```

## Entity Seeder (sample data)

For each entity module that needs sample records:

```typescript
import { Injectable } from '@nestjs/common';
import { CategoryModelService } from '../../modules/category/category-model.service';

@Injectable()
export class CategorySeeder {
  constructor(private readonly categoryModelService: CategoryModelService) {}

  async seed(): Promise<void> {
    const samples = [
      { name: 'Technology', description: 'Tech category' },
      { name: 'Science', description: 'Science category' },
    ];
    for (const data of samples) {
      const exists = await this.categoryModelService.findOne({ where: { name: data.name } });
      if (!exists) {
        await this.categoryModelService.create(data);
      }
    }
  }
}
```
