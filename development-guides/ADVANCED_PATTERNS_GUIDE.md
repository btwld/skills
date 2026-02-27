# Advanced Module Patterns Guide

> **Advanced Patterns**: This guide covers advanced module patterns, dependency injection strategies, and configuration management for building sophisticated, configurable modules in the Rockets SDK ecosystem.

## Table of Contents

1. [Introduction to Advanced Patterns](#introduction-to-advanced-patterns)
2. [ConfigurableModuleBuilder Pattern](#configurablemoduilebuilder-pattern)
3. [Dynamic Module Creation with Extras](#dynamic-module-creation-with-extras)
4. [Provider Factory Patterns](#provider-factory-patterns)
5. [Module Definition vs Simple Module Patterns](#module-definition-vs-simple-module-patterns)
6. [File Generation Order for AI Tools](#file-generation-order-for-ai-tools)
7. [Advanced Dependency Injection Patterns](#advanced-dependency-injection-patterns)
8. [Configuration Management with registerAs](#configuration-management-with-registeras)
9. [Real-World Examples](#real-world-examples)

---

## Introduction to Advanced Patterns

Advanced patterns in the Rockets SDK are designed for creating configurable, reusable modules that can adapt to different environments and requirements. These patterns enable:

- **Dynamic module configuration** with type safety
- **Provider factory functions** for flexible service instantiation
- **Global and local module registration** with extras
- **Configuration management** with compile-time validation
- **Proper dependency injection** with repository abstractions

### When to Use Advanced Patterns

**Use Module Definition Pattern (Advanced) when:**
- Your module needs configuration options (database connections, API keys, feature flags)
- You need multiple registration methods (`register`, `registerAsync`, `forRoot`, `forRootAsync`)
- Dynamic provider creation based on runtime options
- Integration with NestJS ConfigModule for feature-specific settings
- Complex initialization logic or conditional providers

**Use Simple Module Pattern when:**
- Standard CRUD operations only
- No dynamic configuration needs
- Static provider setup
- Straightforward imports and exports

---

## ConfigurableModuleBuilder Pattern

The `ConfigurableModuleBuilder` is the foundation for creating configurable modules with type-safe options and dynamic behavior.

### Basic ConfigurableModuleBuilder Setup

```typescript
// artist.module-definition.ts
import {
  ConfigurableModuleBuilder,
  DynamicModule,
  Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  createSettingsProvider,
  RepositoryInterface,
  getDynamicRepositoryToken,
} from '@concepta/nestjs-common';
import { artistDefaultConfig } from './config/artist-default.config';
import { ArtistOptionsExtrasInterface } from './interfaces/artist-options-extras.interface';
import { ArtistOptionsInterface } from './interfaces/artist-options.interface';
import { ArtistSettingsInterface } from './interfaces/artist-settings.interface';
import { ArtistEntityInterface } from './interfaces/artist-entity.interface';
import {
  ARTIST_MODULE_SETTINGS_TOKEN,
  ARTIST_MODULE_ARTIST_ENTITY_KEY,
} from './artist.constants';
import { ArtistModelService } from './services/artist-model.service';

const RAW_OPTIONS_TOKEN = Symbol('__ARTIST_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: ArtistModuleClass,
  OPTIONS_TYPE: ARTIST_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: ARTIST_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ArtistOptionsInterface>({
  moduleName: 'Artist',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<ArtistOptionsExtrasInterface>({ global: false }, definitionTransform)
  .build();

export type ArtistOptions = Omit<typeof ARTIST_OPTIONS_TYPE, 'global'>;
export type ArtistAsyncOptions = Omit<typeof ARTIST_ASYNC_OPTIONS_TYPE, 'global'>;
```

### Key Components Explained

- **`RAW_OPTIONS_TOKEN`**: Symbol for internal options injection
- **`ConfigurableModuleBuilder<T>`**: Generic builder accepting options interface
- **`setExtras<T>`**: Adds extra options like `global` flag with transformation
- **Type exports**: Clean types excluding internal properties

---

## Dynamic Module Creation with Extras

The `definitionTransform` function is where the magic happens - it transforms module definitions based on options and extras.

### Definition Transform Function

```typescript
function definitionTransform(
  definition: DynamicModule,
  extras: ArtistOptionsExtrasInterface,
): DynamicModule {
  const { imports, providers = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createArtistImports({ imports }),
    providers: createArtistProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createArtistExports()],
  };
}
```

### Factory Functions for Dynamic Module Components

```typescript
export function createArtistImports(options: {
  imports: DynamicModule['imports'];
}): DynamicModule['imports'] {
  return [
    ...(options.imports || []),
    ConfigModule.forFeature(artistDefaultConfig),
  ];
}

export function createArtistProviders(options: {
  overrides?: ArtistOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    createArtistSettingsProvider(options.overrides),
    createArtistModelServiceProvider(options.overrides),
  ];
}

export function createArtistExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [
    ARTIST_MODULE_SETTINGS_TOKEN,
    ArtistModelService,
  ];
}
```

### Extras Interface Pattern

```typescript
// interfaces/artist-options-extras.interface.ts
export interface ArtistOptionsExtrasInterface {
  /**
   * Determines if the module should be registered globally
   * @default false
   */
  global?: boolean;
}
```

---

## Provider Factory Patterns

Provider factories enable dynamic service creation with configuration-driven behavior.

### Settings Provider Factory

```typescript
export function createArtistSettingsProvider(
  optionsOverrides?: ArtistOptions,
): Provider {
  return createSettingsProvider<ArtistSettingsInterface, ArtistOptionsInterface>({
    settingsToken: ARTIST_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: artistDefaultConfig.KEY,
    optionsOverrides,
  });
}
```

### Model Service Provider Factory

```typescript
export function createArtistModelServiceProvider(
  optionsOverrides?: ArtistOptions,
): Provider {
  return {
    provide: ArtistModelService,
    inject: [
      getDynamicRepositoryToken(ARTIST_MODULE_ARTIST_ENTITY_KEY),
      ARTIST_MODULE_SETTINGS_TOKEN,
    ],
    useFactory: (
      repo: RepositoryInterface<ArtistEntityInterface>,
      settings: ArtistSettingsInterface,
    ) => new ArtistModelService(repo, settings),
  };
}
```

### Advanced Provider Factory with Conditional Logic

```typescript
export function createAdvancedServiceProvider(
  options?: ModuleOptions,
): Provider {
  return {
    provide: 'ADVANCED_SERVICE',
    inject: [ConfigService, 'DATABASE_CONNECTION'],
    useFactory: (configService: ConfigService, dbConnection: any) => {
      const useRedis = configService.get('USE_REDIS', false);
      
      if (useRedis) {
        return new RedisAdvancedService(dbConnection);
      }
      
      return new DefaultAdvancedService(dbConnection);
    },
  };
}
```

---

## Module Definition vs Simple Module Patterns

### Module Definition Pattern (Configurable)

**File Structure:**
```
src/modules/artist/
├── artist.module.ts
├── artist.module-definition.ts  ← Advanced configuration
├── config/
│   └── artist-default.config.ts
├── interfaces/
│   ├── artist-options.interface.ts
│   ├── artist-options-extras.interface.ts
│   └── artist-settings.interface.ts
└── services/
    └── artist-model.service.ts
```

**Final Module Implementation:**
```typescript
// artist.module.ts
import { Module } from '@nestjs/common';
import { ArtistModuleClass } from './artist.module-definition';

@Module({})
export class ArtistModule extends ArtistModuleClass {
  static register(options: ArtistOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: ArtistAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: ArtistOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: ArtistAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }
}
```

### Simple Module Pattern

```typescript
// artist.module.ts (Simple version)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtistEntity } from './entities/artist.entity';
import { ArtistService } from './services/artist.service';
import { ArtistController } from './controllers/artist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ArtistEntity])],
  providers: [ArtistService],
  controllers: [ArtistController],
  exports: [ArtistService],
})
export class ArtistModule {}
```

---

## File Generation Order for AI Tools

**Critical: Follow this exact order to avoid dependency issues:**

1. **`interfaces/entity.interface.ts`** → Define all contracts first
2. **`entities/entity.entity.ts`** → Create database entity
3. **`dto/entity.dto.ts`** → Create all DTOs extending base DTOs
4. **`exceptions/entity.exception.ts`** → Create all custom exceptions
5. **`services/entity-model.service.ts`** → Create ModelService
6. **`adapters/entity-crud.adapter.ts`** → Create CRUD adapter (if needed)
7. **`crud/entity-crud.builder.ts`** → Create CRUD builder (if needed)
8. **`entity.module-definition.ts`** → Create module definition (if configurable)
9. **`entity.module.ts`** → Create final module

### Why This Order Matters

- **Interfaces first**: Establish contracts before implementations
- **Entity before DTOs**: DTOs may reference entity properties
- **Services before adapters**: Adapters may inject services
- **Module definition before module**: Module extends the definition class

### AI Generation Checklist

```typescript
// ✅ BEFORE generating code, verify:
- [ ] All DTOs have @Exclude() at class level
- [ ] All DTO properties have @Expose() decorator
- [ ] ModelService uses @InjectDynamicRepository, not @InjectRepository
- [ ] Only create UserModelService if extending/overriding (it already exists!)
- [ ] CRUD adapters use @InjectRepository, not @InjectDynamicRepository
- [ ] All custom exceptions extend RuntimeException
- [ ] All interfaces are properly implemented
- [ ] No direct repository injection in controllers/services
- [ ] Configuration uses registerAs pattern with ConfigType injection
- [ ] No `any` types used anywhere
- [ ] All required imports are present
```

---

## Advanced Dependency Injection Patterns

### Repository Injection Patterns

**For Business Logic (ModelService):**
```typescript
@Injectable()
export class ArtistModelService extends ModelService<
  ArtistEntityInterface,
  ArtistCreatableInterface,
  ArtistUpdatableInterface,
  ArtistReplaceableInterface
> {
  constructor(
    @InjectDynamicRepository(ARTIST_MODULE_ARTIST_ENTITY_KEY)
    repo: RepositoryInterface<ArtistEntityInterface>,
  ) {
    super(repo);
  }

  // Add custom business methods
  async byName(name: string): Promise<ArtistEntityInterface | null> {
    return this.repo.findOne({ where: { name } });
  }
}
```

**For CRUD Operations (Adapter):**
```typescript
@Injectable()
export class ArtistTypeOrmCrudAdapter extends TypeOrmCrudAdapter<ArtistEntity> {
  constructor(
    @InjectRepository(ArtistEntity)
    private readonly repository: Repository<ArtistEntity>,
  ) {
    super(repository);
  }
}
```

### Key Injection Rules

- **`@InjectDynamicRepository`** → Use in ModelService for business logic
- **`@InjectRepository`** → Use in CRUD adapters for database operations
- **Never inject repositories directly** → Always use the abstraction layers

---

## Configuration Management with registerAs

### Creating Type-Safe Configuration

```typescript
// config/rockets-server.config.ts
import { registerAs } from '@nestjs/config';
import { RocketsServerSettingsInterface } from '../interfaces/rockets-server-settings.interface';
import { ROCKETS_SERVER_MODULE_OPTIONS_DEFAULT_SETTINGS_TOKEN } from '../rockets-server.constants';

/**
 * Rockets Server configuration
 * 
 * This organizes all Rockets Server settings into a single namespace
 * for better maintainability and type safety.
 */
export const rocketsServerOptionsDefaultConfig = registerAs(
  ROCKETS_SERVER_MODULE_OPTIONS_DEFAULT_SETTINGS_TOKEN,
  (): RocketsServerSettingsInterface => {
    return {
      role: {
        adminRoleName: process.env?.ADMIN_ROLE_NAME ?? 'admin',
      },
      email: {
        from: process.env?.EMAIL_FROM ?? 'noreply@yourapp.com',
        baseUrl: process.env?.BASE_URL ?? 'http://localhost:3000',
      },
      otp: {
        expiresIn: process.env?.OTP_EXPIRES_IN ?? '15m',
      },
    };
  },
);
```

### Advanced Injection with ConfigType

**Best Practice Pattern:**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { rocketsServerOptionsDefaultConfig } from '../config/rockets-server.config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(rocketsServerOptionsDefaultConfig.KEY)
    private readonly rocketsConfig: ConfigType<typeof rocketsServerOptionsDefaultConfig>,
  ) {}

  async sendOtp(email: string): Promise<void> {
    // ✅ Full type safety - no type assertions needed
    const otpExpiry = this.rocketsConfig.otp.expiresIn;
    const emailFrom = this.rocketsConfig.email.from;
    const baseUrl = this.rocketsConfig.email.baseUrl;
    
    // Your OTP logic here
  }
}
```

### Benefits of This Pattern

- ✅ **Full Type Safety** - No type assertions needed
- ✅ **Compile-time Validation** - Catches errors at build time
- ✅ **IDE Support** - Autocomplete, refactoring, go-to-definition
- ✅ **Performance** - No runtime type checking overhead
- ✅ **Easy Testing** - Simple to mock the injected configuration

### Configuration with Validation

```typescript
import { z } from 'zod'; // Optional: for runtime validation

const rocketsServerSchema = z.object({
  role: z.object({
    adminRoleName: z.string().min(1, 'Admin role name is required'),
  }),
  email: z.object({
    from: z.string().email('Invalid email format'),
    baseUrl: z.string().url('Invalid URL format'),
  }),
  otp: z.object({
    expiresIn: z.string().regex(/^\d+[mhd]$/, 'Invalid time format (e.g., 15m, 1h, 1d)'),
  }),
});

export const rocketsServerOptionsDefaultConfig = registerAs(
  ROCKETS_SERVER_MODULE_OPTIONS_DEFAULT_SETTINGS_TOKEN,
  (): RocketsServerSettingsInterface => {
    const config = {
      role: {
        adminRoleName: process.env?.ADMIN_ROLE_NAME ?? 'admin',
      },
      email: {
        from: process.env?.EMAIL_FROM ?? 'noreply@yourapp.com',
        baseUrl: process.env?.BASE_URL ?? 'http://localhost:3000',
      },
      otp: {
        expiresIn: process.env?.OTP_EXPIRES_IN ?? '15m',
      },
    };

    // Optional: validate at runtime
    return rocketsServerSchema.parse(config);
  },
);
```

---

## Real-World Examples

### Complete Configurable Module Example

```typescript
// song.module-definition.ts
import {
  ConfigurableModuleBuilder,
  DynamicModule,
  Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  createSettingsProvider,
  RepositoryInterface,
  getDynamicRepositoryToken,
} from '@concepta/nestjs-common';

const RAW_OPTIONS_TOKEN = Symbol('__SONG_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: SongModuleClass,
  OPTIONS_TYPE: SONG_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: SONG_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<SongOptionsInterface>({
  moduleName: 'Song',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<SongOptionsExtrasInterface>({ global: false }, definitionTransform)
  .build();

function definitionTransform(
  definition: DynamicModule,
  extras: SongOptionsExtrasInterface,
): DynamicModule {
  const { imports, providers = [] } = definition;
  const { global = false, enableCaching = false } = extras;

  const dynamicProviders = [
    ...providers,
    createSongSettingsProvider(),
    createSongModelServiceProvider(),
  ];

  // Conditionally add caching provider
  if (enableCaching) {
    dynamicProviders.push(createSongCacheProvider());
  }

  return {
    ...definition,
    global,
    imports: [
      ...(imports || []),
      ConfigModule.forFeature(songDefaultConfig),
    ],
    providers: dynamicProviders,
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, SongModelService],
  };
}
```

### Multi-Provider Factory Pattern

```typescript
export function createSongProviders(options: {
  enableCaching?: boolean;
  enableSearch?: boolean;
}): Provider[] {
  const providers: Provider[] = [
    createSongModelServiceProvider(),
    createSongSettingsProvider(),
  ];

  if (options.enableCaching) {
    providers.push({
      provide: 'SONG_CACHE',
      useClass: RedisCacheService,
    });
  }

  if (options.enableSearch) {
    providers.push({
      provide: 'SONG_SEARCH',
      useClass: ElasticsearchService,
    });
  }

  return providers;
}
```

### Environment-Specific Configuration

```typescript
export const songDefaultConfig = registerAs(
  SONG_MODULE_OPTIONS_DEFAULT_SETTINGS_TOKEN,
  (): SongSettingsInterface => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      caching: {
        enabled: isProduction,
        ttl: isProduction ? 3600 : 60, // 1 hour in prod, 1 minute in dev
      },
      search: {
        enabled: process.env.ENABLE_SEARCH === 'true',
        indexName: `songs-${process.env.NODE_ENV}`,
      },
      storage: {
        provider: isProduction ? 's3' : 'local',
        bucketName: process.env.S3_BUCKET ?? 'dev-bucket',
      },
    };
  },
);
```

---

## Summary

These advanced patterns enable you to create highly configurable, type-safe modules that can adapt to different environments and requirements. Key takeaways:

1. **Use ConfigurableModuleBuilder** for modules that need configuration
2. **Implement definitionTransform** for dynamic behavior based on options
3. **Create provider factories** for flexible service instantiation
4. **Follow proper injection patterns** (`@InjectDynamicRepository` vs `@InjectRepository`)
5. **Use registerAs with ConfigType** for type-safe configuration management
6. **Follow the file generation order** to avoid dependency issues

These patterns ensure your modules are maintainable, testable, and consistent across the Rockets ecosystem.