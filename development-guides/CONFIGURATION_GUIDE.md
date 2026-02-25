# ⚙️ CONFIGURATION GUIDE

> **For AI Tools**: This guide contains all application setup and configuration patterns for Rockets SDK. Use this when setting up new applications or configuring rockets and rockets-auth packages.

## 📋 **Quick Reference**

| Task | Section | Time |
|------|---------|------|
| **Package version alignment** | [Package Version Requirements](#package-version-requirements) | 2 min |
| **Module Import Order** | [Module Import Order](#module-import-order) | 2 min |
| Setup main.ts application | [Application Bootstrap](#application-bootstrap) | 5 min |
| Configure rockets | [Rockets Server Configuration](#rockets-configuration) | 10 min |
| Configure rockets-auth | [Rockets Server Auth Configuration](#rockets-auth-configuration) | 15 min |
| Environment variables | [Environment Configuration](#environment-configuration) | 5 min |
| Database setup | [Database Configuration](#database-configuration) | 10 min |

---

## 🚨 **Package Version Requirements**

> **NOTE**: `@bitwild/rockets-auth` 1.0.0-alpha.7 is compatible with NestJS **11** and `@concepta/nestjs-*` at **7.0.0-alpha.10**. Earlier alpha versions required NestJS 10, but this constraint no longer applies.

### **Required package.json versions**

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/swagger": "^11.0.0",
    "@nestjs/typeorm": "^11.0.0",
    "@bitwild/rockets": "1.0.0-alpha.7",
    "@bitwild/rockets-auth": "1.0.0-alpha.7",
    "@concepta/nestjs-access-control": "7.0.0-alpha.10",
    "@concepta/nestjs-authentication": "7.0.0-alpha.10",
    "@concepta/nestjs-common": "7.0.0-alpha.10",
    "@concepta/nestjs-crud": "7.0.0-alpha.10",
    "@concepta/nestjs-event": "7.0.0-alpha.10",
    "@concepta/nestjs-swagger-ui": "7.0.0-alpha.10",
    "@concepta/nestjs-typeorm-ext": "7.0.0-alpha.10",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "pg": "^8.13.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "typeorm": "0.3.20"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@types/node": "^22.0.0",
    "typescript": "~5.7.0"
  },
  "resolutions": { "typeorm": "0.3.20" },
  "overrides": { "typeorm": "0.3.20" }
}
```

### **Version alignment rules**

| Constraint | Reason |
|------------|--------|
| NestJS **11.x** | rockets-auth 1.0.0-alpha.7 supports NestJS 11 |
| All `@concepta/nestjs-*` at **7.0.0-alpha.10** | Must match the versions compatible with rockets-auth alpha.7 |
| TypeORM pinned to **0.3.20** | Prevents breaking API changes from minor bumps |
| `@nestjs/cli` at **^11.0.0** | Must match NestJS 11 major version |

### **How to verify zero nested copies**

After `npm install`, run:

```bash
find node_modules -path '*/@nestjs/common/package.json' -not -path 'node_modules/@nestjs/common/package.json' | wc -l
# Must be 0 — any nonzero value means version mismatch
```

---

## ⚠️ **Module Import Order**

> **CRITICAL**: When using both `RocketsModule` and `RocketsAuthModule` together, the import order is **mandatory**.

### **Correct Import Order**

```typescript
// app.module.ts
@Module({
  imports: [
    // 1. FIRST: RocketsAuthModule - provides RocketsJwtAuthProvider
    RocketsAuthModule.forRootAsync({
      // ... configuration
    }),
    
    // 2. SECOND: RocketsModule - consumes RocketsJwtAuthProvider
    RocketsModule.forRootAsync({
      inject: [RocketsJwtAuthProvider],
      useFactory: (authProvider: RocketsJwtAuthProvider) => ({
        authProvider,
        enableGlobalGuard: true,
        // ... other configuration
      }),
    }),
  ],
})
export class AppModule {}
```

### **Why This Order Matters**

- **RocketsAuthModule** exports `RocketsJwtAuthProvider`
- **RocketsModule** needs to inject `RocketsJwtAuthProvider` for authentication
- **Dependency Resolution**: NestJS resolves dependencies in import order

### **With Access Control**

When adding AccessControlModule, use this order:

```typescript
@Module({
  imports: [
    // 1. AccessControlModule (global module)
    AccessControlModule.forRoot({...}),
    
    // 2. RocketsAuthModule with ACL configuration
    RocketsAuthModule.forRootAsync({
      accessControl: { ... },
      // ... other config
    }),
    
    // 3. RocketsModule with auth provider
    RocketsModule.forRootAsync({
      inject: [RocketsJwtAuthProvider],
      // ... config
    }),
  ],
})
```

### **Common Errors**

```bash
# Wrong order causes this error:
❌ Nest can't resolve dependencies of RocketsModule (?). 
   Please make sure that the RocketsJwtAuthProvider is available.

# Solution: Import RocketsAuthModule BEFORE RocketsModule
✅ RocketsAuthModule → RocketsModule
```

---

## 🚀 **Application Bootstrap**

### **Main Application Setup (main.ts)**

The latest Rockets SDK provides built-in services for automatic application setup:

```typescript
// main.ts
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerUiService } from '@concepta/nestjs-swagger-ui';
import { ExceptionsFilter } from '@bitwild/rockets';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }));

  // Enable CORS
  app.enableCors();

  // Swagger setup
  const swaggerUiService = app.get(SwaggerUiService);
  swaggerUiService.builder()
    .setTitle('My API')
    .setDescription('Rockets SDK API')
    .setVersion('1.0')
    .addBearerAuth();
  swaggerUiService.setup(app);

  // Global exception filter from Rockets
  // NOTE: `as any` is required due to nested package type conflicts
  const exceptionsFilter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ExceptionsFilter(exceptionsFilter as any));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`API docs available at http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
```

### **Key Features:**
- ✅ **Automatic Swagger Configuration**: SDK handles DocumentBuilder setup
- ✅ **JWT Configuration**: Automatic JWT strategy registration
- ✅ **Global Validation**: Enhanced validation with transformation
- ✅ **CORS Support**: Configurable cross-origin requests
- ✅ **Error Handling**: Built-in exception filters

---

## 🔧 **Rockets Server Configuration**

### **Basic Setup (External Auth Provider)**

```typescript
// app.module.ts - rockets only
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RocketsModule } from '@bitwild/rockets';
import { YourExternalAuthProvider } from './auth/your-external-auth.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    RocketsModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        authProvider: YourExternalAuthProvider, // Auth0, Firebase, etc.
        settings: {
          metadata: {
            enabled: true,
            userMetadataEntity: 'UserMetadataEntity',
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### **External Auth Provider Example**

```typescript
// auth/auth0.provider.ts
import { Injectable } from '@nestjs/common';
import { AuthProviderInterface } from '@bitwild/rockets';

@Injectable()
export class Auth0Provider implements AuthProviderInterface {
  async validateUser(token: string): Promise<any> {
    // Validate JWT token with Auth0
    // Return user object or throw error
    try {
      const decoded = jwt.verify(token, process.env.AUTH0_PUBLIC_KEY);
      return {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

---

## 🔐 **Rockets Server Auth Configuration**

### **Complete Auth System Setup**

```typescript
// app.module.ts - rockets-auth
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RocketsAuthModule } from '@bitwild/rockets-auth';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? {
          rejectUnauthorized: false
        } : false,
      }),
    }),

    RocketsAuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        settings: {
          // JWT Configuration
          jwt: {
            secret: configService.get('JWT_SECRET'),
            expiresIn: configService.get('JWT_EXPIRES_IN', '1h'),
          },
          
          // Authentication Methods
          authLocal: {
            enabled: true,
            usernameField: 'email',
            passwordField: 'password',
          },
          
          authJwt: {
            enabled: true,
            secretKey: configService.get('JWT_SECRET'),
          },

          // OAuth Providers
          authOAuth: {
            enabled: true,
            google: {
              clientId: configService.get('GOOGLE_CLIENT_ID'),
              clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
              callbackURL: configService.get('GOOGLE_CALLBACK_URL'),
            },
            github: {
              clientId: configService.get('GITHUB_CLIENT_ID'),
              clientSecret: configService.get('GITHUB_CLIENT_SECRET'),
              callbackURL: configService.get('GITHUB_CALLBACK_URL'),
            },
          },

          // Password Recovery
          authRecovery: {
            enabled: true,
            expiresIn: '1h',
            email: {
              from: configService.get('EMAIL_FROM'),
              subject: 'Password Recovery',
            },
          },

          // Email Verification
          authVerify: {
            enabled: true,
            expiresIn: '24h',
            email: {
              from: configService.get('EMAIL_FROM'),
              subject: 'Verify Your Email',
            },
          },

          // OTP/2FA
          otp: {
            enabled: true,
            expiresIn: '5m',
            length: 6,
            email: {
              from: configService.get('EMAIL_FROM'),
              subject: 'Your OTP Code',
            },
          },

          // User Management
          user: {
            enabled: true,
            adminRoleName: 'Admin',
            defaultRoleName: 'User',
          },

          // Admin Features
          userAdmin: {
            enabled: true,
            adminPath: '/admin',
          },

          // Email Configuration
          email: {
            transport: {
              host: configService.get('SMTP_HOST'),
              port: parseInt(configService.get('SMTP_PORT', '587')),
              secure: configService.get('SMTP_SECURE') === 'true',
              auth: {
                user: configService.get('SMTP_USER'),
                pass: configService.get('SMTP_PASS'),
              },
            },
            defaults: {
              from: configService.get('EMAIL_FROM'),
            },
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### **Minimal Auth Configuration**

```typescript
// app.module.ts - minimal rockets-auth
RocketsAuthModule.forRoot({
  settings: {
    // Enable only what you need
    authLocal: { enabled: true },
    authJwt: { enabled: true },
    user: { enabled: true },
    
    // Minimal email configuration
    email: {
      transport: {
        host: 'localhost',
        port: 1025, // MailHog for development
      },
    },
  },
})
```

### **Complete Working Configuration (Reference Implementation)**

> **CRITICAL**: This is the actual working configuration from the reference project. Use this as your primary template when generating new projects.

```typescript
// app.module.ts — Complete working reference
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { EventModule } from '@concepta/nestjs-event';
import { CrudModule } from '@concepta/nestjs-crud';
import { RocketsAuthModule } from '@bitwild/rockets-auth';
import { EmailSendOptionsInterface } from '@concepta/nestjs-common';

// Auth entities (MUST be created in your app — they are NOT auto-provided)
import { UserEntity } from './modules/user/entities/user.entity';
import { UserOtpEntity } from './modules/user/entities/user-otp.entity';
import { FederatedEntity } from './modules/user/entities/federated.entity';
import { UserMetadataEntity } from './modules/user/entities/user-metadata.entity';
import { RoleEntity } from './modules/role/entities/role.entity';
import { UserRoleEntity } from './modules/role/entities/user-role.entity';
import { InvitationEntity } from './modules/invitation/entities/invitation.entity';

// Auth adapters (MUST be created in your app)
import { UserTypeOrmCrudAdapter } from './modules/user/adapters/user-typeorm-crud.adapter';
import { UserMetadataTypeOrmCrudAdapter } from './modules/user/adapters/user-metadata-typeorm-crud.adapter';
import { RoleTypeOrmCrudAdapter } from './modules/role/adapters/role-typeorm-crud.adapter';

// Auth DTOs (extend from @bitwild/rockets-auth base DTOs)
import { UserCreateDto, UserDto, UserUpdateDto } from './modules/user/dto/user.dto';
import { UserMetadataCreateDto, UserMetadataUpdateDto } from './modules/user/dto/user-metadata.dto';
import { RoleCreateDto, RoleDto, RoleUpdateDto } from './modules/role/dto/role.dto';

// Access control
import { ACService } from './access-control.service';
import { acRules, AppRole } from './app.acl';
import { ormSettingsFactory } from './ormconfig';

// Feature modules
import { CategoryModule } from './modules/category/category.module';

@Module({
  imports: [
    // 1. Global configuration
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),

    // 2. EventModule (REQUIRED by RocketsAuthModule — missing this crashes the app)
    EventModule.forRoot({}),

    // 3. CRUD infrastructure
    // NOTE: `as any` casts on CrudModule, adapter, DTO, and RocketsAuthModule
    // are required due to DynamicModule type conflicts from nested package copies
    CrudModule.forRoot({}) as any,

    // 4. TypeORM connection via TypeOrmExtModule
    TypeOrmExtModule.forRootAsync({
      inject: [],
      useFactory: async () => ormSettingsFactory(),
    }),

    // 5. RocketsAuthModule — authentication + access control
    RocketsAuthModule.forRootAsync({
      imports: [
        ConfigModule,
        TypeOrmModule.forFeature([UserEntity]),
        // CRITICAL: ALL 7 entity keys MUST be registered
        TypeOrmExtModule.forFeature({
          user: { entity: UserEntity },
          role: { entity: RoleEntity },
          userRole: { entity: UserRoleEntity },
          userOtp: { entity: UserOtpEntity },
          federated: { entity: FederatedEntity },
          invitation: { entity: InvitationEntity },
          userMetadata: { entity: UserMetadataEntity }, // Missing this → DYNAMIC_REPOSITORY_TOKEN error
        }),
      ],
      inject: [],
      enableGlobalJWTGuard: false,
      useFactory: () => ({
        services: {
          mailerService: {
            sendMail: (options: EmailSendOptionsInterface) => {
              console.log('Email would be sent:', { to: options.to, subject: options.subject });
              return Promise.resolve();
            },
          },
        },
        settings: {
          email: {
            from: 'noreply@example.com',
            baseUrl: 'http://localhost:3001',
            templates: {
              sendOtp: { fileName: 'send-otp.template.hbs', subject: 'Your verification code' },
              invitation: { logo: 'https://example.com/logo.png', fileName: 'invitation.template.hbs', subject: 'You have been invited' },
              invitationAccepted: { logo: 'https://example.com/logo.png', fileName: 'invitation-accepted.template.hbs', subject: 'Invitation accepted' },
            },
          },
          otp: { assignment: 'userOtp', category: 'auth-login', expiresIn: '10m', type: 'uuid' },
          role: { adminRoleName: AppRole.Admin, defaultUserRoleName: AppRole.User },
        },
      }),
      userCrud: {
        imports: [TypeOrmModule.forFeature([UserEntity, UserMetadataEntity])],
        model: UserDto,
        adapter: UserTypeOrmCrudAdapter as any,
        dto: { createOne: UserCreateDto, updateOne: UserUpdateDto },
        userMetadataConfig: {
          imports: [TypeOrmModule.forFeature([UserMetadataEntity])],
          entity: UserMetadataEntity,
          adapter: UserMetadataTypeOrmCrudAdapter as any,
          createDto: UserMetadataCreateDto as any,
          updateDto: UserMetadataUpdateDto as any,
        },
      },
      roleCrud: {
        imports: [TypeOrmModule.forFeature([RoleEntity])],
        adapter: RoleTypeOrmCrudAdapter as any,
        model: RoleDto,
        dto: { createOne: RoleCreateDto, updateOne: RoleUpdateDto },
      },
      accessControl: {
        service: new ACService(),
        settings: { rules: acRules },
      },
    }) as any,

    // 6. Feature modules
    CategoryModule,
  ],
})
export class AppModule {}
```

**Auth boilerplate files required** (13 files that MUST exist in your project):
- 7 entity files: `UserEntity`, `UserOtpEntity`, `FederatedEntity`, `UserMetadataEntity`, `RoleEntity`, `UserRoleEntity`, `InvitationEntity`
- 3 adapter files: `UserTypeOrmCrudAdapter`, `UserMetadataTypeOrmCrudAdapter`, `RoleTypeOrmCrudAdapter`
- 3 DTO files: user DTOs (extending `RocketsAuthUserDto`), user-metadata DTOs (**custom — no SDK base**), role DTOs (extending `RocketsAuthRoleDto`)

### **Entity interface availability** (from `@bitwild/rockets-auth`)

| Entity | SDK Interface | Pattern |
|--------|--------------|---------|
| **UserEntity** | `RocketsAuthUserEntityInterface` | `implements RocketsAuthUserEntityInterface` |
| **RoleEntity** | `RocketsAuthRoleEntityInterface` | `implements RocketsAuthRoleEntityInterface` |
| **UserMetadataEntity** | `RocketsAuthUserMetadataEntityInterface` | `implements RocketsAuthUserMetadataEntityInterface` |
| **UserOtpEntity** | ❌ Not exported | `extends CommonPostgresEntity` only |
| **FederatedEntity** | ❌ Not exported | `extends CommonPostgresEntity` only |
| **UserRoleEntity** | ❌ Not exported | `extends CommonPostgresEntity` only |
| **InvitationEntity** | ❌ Not exported | `extends CommonPostgresEntity` only |

### **Entity property requirements**

- `UserEntity.passwordHash` → `!: string | null` (definite assignment, nullable)
- `UserEntity.passwordSalt` → `!: string | null` (definite assignment, nullable)
- `UserEntity.active` → `!: boolean` (definite assignment, default true)
- `RoleEntity.description` → `!: string` (definite assignment, default '')
- `RoleCreateDto.description` → `!: string` (**required**, not optional — `RocketsAuthRoleCreatableInterface` requires it)
- `UserMetadataEntity.userId` → `!: string` (definite assignment, required)

### **User Metadata DTOs**

`RocketsAuthUserMetadataCreateDto` and `RocketsAuthUserMetadataUpdateDto` are **not exported** from the SDK. Create custom DTOs:

```typescript
// user-metadata.dto.ts
@Exclude()
export class UserMetadataCreateDto {
  @Expose() @IsUUID() userId!: string;
  @Expose() @IsString() key!: string;
  @Expose() @IsOptional() value?: unknown;
}

@Exclude()
export class UserMetadataUpdateDto {
  @Expose() @IsUUID() id!: string;
  @Expose() @IsString() @IsOptional() key?: string;
  @Expose() @IsOptional() value?: unknown;
}
```

### **AccessControlServiceInterface**

Must use `ExecutionContext` parameter (not `string`):

```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AccessControlServiceInterface } from '@concepta/nestjs-access-control';

@Injectable()
export class ACService implements AccessControlServiceInterface {
  async getUser(context: ExecutionContext): Promise<unknown> {
    return { id: 'system', roles: ['admin'] };
  }
  async getUserRoles(context: ExecutionContext): Promise<string[]> {
    return ['admin'];
  }
}
```

### **Required `as any` casts**

Due to DynamicModule type conflicts from nested package copies, these casts are required:

| Location | Cast |
|----------|------|
| `CrudModule.forRoot({})` | `CrudModule.forRoot({}) as any` |
| `RocketsAuthModule.forRootAsync({...})` | `}) as any` at the end |
| Adapter references in userCrud/roleCrud | `adapter: XxxAdapter as any` |
| Metadata DTOs | `createDto: XxxDto as any, updateDto: XxxDto as any` |
| `ExceptionsFilter` in main.ts | `new ExceptionsFilter(exceptionsFilter as any)` |

See the `rockets-starter` project for reference implementations of all 13 files.

---

### **Complete Configuration with CRUD Admin**

```typescript
// app.module.ts - Complete auth with admin CRUD functionality
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';
import { RocketsAuthModule } from '@bitwild/rockets-auth';
import { 
  UserEntity, 
  RoleEntity, 
  UserTypeOrmCrudAdapter, 
  RoleTypeOrmCrudAdapter,
  RocketsAuthUserDto,
  RocketsAuthRoleDto,
  RocketsAuthUserCreateDto,
  RocketsAuthUserUpdateDto,
  RocketsAuthRoleCreateDto,
  RocketsAuthRoleUpdateDto,
} from '@bitwild/rockets-auth';

@Module({
  imports: [
    // Enhanced TypeORM for model services
    TypeOrmExtModule.forFeature({
      user: { entity: UserEntity },
      role: { entity: RoleEntity },
    }),
    
    // Standard TypeORM for CRUD operations (required for adapters)
    TypeOrmModule.forFeature([UserEntity, RoleEntity]),
    
    RocketsAuthModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        settings: {
          authLocal: { enabled: true },
          authJwt: { enabled: true },
          user: { enabled: true },
          userAdmin: { enabled: true },
        },
        
        // User CRUD Admin Configuration
        userCrud: {
          imports: [TypeOrmModule.forFeature([UserEntity])], // Required for adapter
          adapter: UserTypeOrmCrudAdapter,
          model: RocketsAuthUserDto,
          dto: {
            createOne: RocketsAuthUserCreateDto,
            updateOne: RocketsAuthUserUpdateDto,
          },
        },
        
        // Role CRUD Admin Configuration  
        roleCrud: {
          imports: [TypeOrmModule.forFeature([RoleEntity])], // Required for adapter
          adapter: RoleTypeOrmCrudAdapter,
          model: RocketsAuthRoleDto,
          dto: {
            createOne: RocketsAuthRoleCreateDto,
            updateOne: RocketsAuthRoleUpdateDto,
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

**Key Points:**

### 📌 **TypeORM Module Usage: When to Use Which?**

#### **TypeOrmExtModule.forFeature({ ... })**

**Purpose:** Dynamic repository injection for Model Services

**When to use:**
- ✅ When you need to inject repositories into **Model Services** (e.g., `UserModelService`, `RoleModelService`)
- ✅ When using `@InjectDynamicRepository()` decorator
- ✅ **REQUIRED** by Rockets packages (rockets, rockets-auth) for their internal Model Services
- ✅ Provides enhanced repository features and dynamic token injection

**Pattern:**
```typescript
TypeOrmExtModule.forFeature({
  user: { entity: UserEntity },        // Key-based injection
  role: { entity: RoleEntity },
  pet: { entity: PetEntity },
})
```

**Usage in services:**
```typescript
@Injectable()
export class PetModelService {
  constructor(
    @InjectDynamicRepository('pet')  // Matches the key above
    private readonly repo: Repository<PetEntity>,
  ) {}
}
```

---

#### **TypeOrmModule.forFeature([...])**

**Purpose:** Standard TypeORM repository injection for CRUD operations

**When to use:**
- ✅ When you need to inject repositories into **CRUD Adapters** (e.g., `PetTypeOrmCrudAdapter`)
- ✅ When using `@InjectRepository()` decorator (standard TypeORM)
- ✅ **REQUIRED** for all CRUD operations with TypeORM adapters
- ✅ **REQUIRED** in CRUD configuration imports (userCrud, roleCrud, etc.)

**Pattern:**
```typescript
TypeOrmModule.forFeature([UserEntity, RoleEntity, PetEntity])  // Array of entities
```

**Usage in adapters:**
```typescript
@Injectable()
export class PetTypeOrmCrudAdapter {
  constructor(
    @InjectRepository(PetEntity)  // Standard TypeORM injection
    private readonly repo: Repository<PetEntity>,
  ) {}
}
```

---

#### **When You Need Both (Common Pattern)**

**For most CRUD modules, you'll use BOTH:**

```typescript
@Module({
  imports: [
    // For CRUD operations (adapters)
    TypeOrmModule.forFeature([PetEntity]),
    
    // For Model Services (model services used by Rockets)
    TypeOrmExtModule.forFeature({
      pet: { entity: PetEntity },
    }),
  ],
  providers: [
    PetTypeOrmCrudAdapter,  // Uses TypeOrmModule
    PetModelService,         // Uses TypeOrmExtModule
    PetCrudService,
  ],
})
export class PetModule {}
```

---

#### **Quick Decision Tree**

```
Are you implementing CRUD operations?
├─ YES → Use TypeOrmModule.forFeature([Entity])
│        (Required for CrudAdapter)
│
└─ Are you using Rockets Model Services?
   └─ YES → ALSO use TypeOrmExtModule.forFeature({ key: { entity: Entity } })
            (Required for ModelService injection)
```

---

#### **Common Mistakes to Avoid**

❌ **Mistake 1:** Only using `TypeOrmExtModule` for CRUD
```typescript
// WRONG - CRUD adapters need TypeOrmModule
@Module({
  imports: [
    TypeOrmExtModule.forFeature({ pet: { entity: PetEntity } }),
  ],
  providers: [PetTypeOrmCrudAdapter], // ❌ Won't work!
})
```

❌ **Mistake 2:** Forgetting `TypeOrmModule` in CRUD config imports
```typescript
// WRONG - CRUD config needs its own imports
userCrud: {
  adapter: UserTypeOrmCrudAdapter,  // ❌ Won't find repository!
  // Missing: imports: [TypeOrmModule.forFeature([UserEntity])]
}
```

✅ **Correct:** Include both when needed
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([PetEntity]),      // For CRUD
    TypeOrmExtModule.forFeature({               // For Model Services
      pet: { entity: PetEntity },
    }),
  ],
})
```

---

#### **Summary**

| Module | Use For | Injection | Pattern |
|--------|---------|-----------|---------|
| `TypeOrmExtModule` | Model Services | `@InjectDynamicRepository('key')` | `{ key: { entity: Entity } }` |
| `TypeOrmModule` | CRUD Adapters | `@InjectRepository(Entity)` | `[Entity]` |

**Rule of Thumb:** If you're doing CRUD operations with Rockets → **Use both**

---

## 🗄️ **Database Configuration**

### **PostgreSQL (Recommended for Production)**

```typescript
// Database configuration with connection pooling
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    url: configService.get('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('NODE_ENV') === 'development',
    
    // Connection pooling
    extra: {
      max: parseInt(configService.get('DB_MAX_CONNECTIONS', '10')),
      min: parseInt(configService.get('DB_MIN_CONNECTIONS', '1')),
      acquire: parseInt(configService.get('DB_ACQUIRE_TIMEOUT', '60000')),
      idle: parseInt(configService.get('DB_IDLE_TIMEOUT', '10000')),
    },
    
    // SSL configuration for production
    ssl: configService.get('NODE_ENV') === 'production' ? {
      rejectUnauthorized: false
    } : false,
  }),
})
```

### **SQLite (Development Only)**

```typescript
// Simple SQLite for development
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: 'database.sqlite',
  autoLoadEntities: true,
  synchronize: true,
  logging: true,
})
```

### **MySQL/MariaDB Alternative**

```typescript
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'mysql',
    host: configService.get('DB_HOST'),
    port: parseInt(configService.get('DB_PORT', '3306')),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    autoLoadEntities: true,
    synchronize: configService.get('NODE_ENV') === 'development',
  }),
})
```

---

## 🌍 **Environment Configuration**

### **Complete Environment Variables**

```bash
# .env file
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/rockets_db
DB_MAX_CONNECTIONS=10
DB_MIN_CONNECTIONS=1

# Application Settings
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=1h

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Your App <noreply@yourapp.com>"

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# External Auth (if using rockets only)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_PUBLIC_KEY=your-auth0-public-key

# File Storage (Optional)
S3_BUCKET=your-s3-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Logging (Optional)
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### **Environment Validation**

```typescript
// config/env.validation.ts
import { plainToClass, Transform } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  PORT: number = 3000;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  SMTP_HOST: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  SMTP_PORT: number = 587;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  SMTP_SECURE: boolean = false;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

// Use in app.module.ts
ConfigModule.forRoot({
  validate,
  isGlobal: true,
})
```

---

## 🔧 **Advanced Configuration Patterns**

### **Multi-Environment Setup**

```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  email: {
    transport: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
  },
});

// Use in app.module.ts
ConfigModule.forRoot({
  load: [configuration],
  isGlobal: true,
})
```

### **Custom Configuration Service**

```typescript
// config/app.config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get jwtSecret(): string {
    return this.configService.get('JWT_SECRET');
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL');
  }

  get emailConfig() {
    return {
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT', '587')),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    };
  }

  get googleOAuth() {
    return {
      clientId: this.configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: this.configService.get('GOOGLE_CALLBACK_URL'),
    };
  }
}
```

---

## 🐳 **Docker Configuration**

### **Docker Compose for Development**

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/rockets_db
      - JWT_SECRET=your-super-secret-jwt-key
    depends_on:
      - db
      - redis
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=rockets_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
```

### **Dockerfile**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

---

## ✅ **Configuration Best Practices**

### **1. Security Configuration**
```typescript
// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}));
```

### **2. Logging Configuration**
```typescript
// Enhanced logging
const logger = new Logger('Bootstrap');
logger.log(`🚀 Application running on port ${port}`);
logger.log(`📚 API Documentation: http://localhost:${port}/api`);
logger.log(`🗄️ Database: ${configService.get('NODE_ENV')}`);
```

### **3. Graceful Shutdown**
```typescript
// main.ts
process.on('SIGTERM', async () => {
  logger.log('SIGTERM received, shutting down gracefully');
  await app.close();
  process.exit(0);
});
```

---

## 🎯 **Configuration Checklist**

### **✅ Essential Configuration**
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] JWT secret set (minimum 32 characters)
- [ ] Email transport configured
- [ ] Swagger documentation accessible
- [ ] CORS configured for frontend

### **✅ Production Ready**
- [ ] SSL/TLS enabled
- [ ] Database connection pooling
- [ ] Environment validation
- [ ] Logging configured
- [ ] Error monitoring (Sentry)
- [ ] Rate limiting enabled
- [ ] Security headers applied

### **✅ Optional Features**
- [ ] OAuth providers configured
- [ ] File storage (S3) configured
- [ ] Redis caching enabled
- [ ] Email templates customized
- [ ] Admin panel enabled

---

## 🚀 **Next Steps**

After completing configuration:

1. **📖 Read [CRUD_PATTERNS_GUIDE.md](./CRUD_PATTERNS_GUIDE.md)** - Implement business modules
2. **📖 Read [ACCESS_CONTROL_GUIDE.md](./ACCESS_CONTROL_GUIDE.md)** - Configure security
3. **Use `rockets-crud-generator` skill** - Generate modules

**⚡ Your Rockets application is now configured and ready for development!**