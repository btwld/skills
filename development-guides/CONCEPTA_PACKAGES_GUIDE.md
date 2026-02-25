# 🎯 CONCEPTA PACKAGES ECOSYSTEM GUIDE

> **For AI Tools**: This guide covers the complete @concepta package ecosystem (32 packages) that powers Rockets SDK. Use this when you need to integrate specific features or understand the underlying architecture.

## 📋 **Quick Reference**

| Category | Packages | Purpose |
|----------|----------|---------|
| [Core Foundation](#core-foundation-5-packages) | 5 packages | Essential base functionality |
| [Authentication Ecosystem](#authentication-ecosystem-11-packages) | 11 packages | Complete auth system |
| [Feature Packages](#feature-packages-16-packages) | 16 packages | Add-on functionality |

---

## 🏗️ **Core Foundation (5 packages)**

These are the essential packages that every Rockets application uses:

### **@concepta/nestjs-common**
```typescript
// Base interfaces and utilities
import { 
  ReferenceIdInterface, 
  AuditInterface, 
  ModelService,
  RuntimeException 
} from '@concepta/nestjs-common';

// Used in every entity interface
export interface ArtistInterface extends ReferenceIdInterface, AuditInterface {
  name: string;
}
```

### **@concepta/nestjs-typeorm-ext**
```typescript
// Extended TypeORM functionality
import { 
  TypeOrmExtModule, 
  CommonPostgresEntity,
  InjectDynamicRepository 
} from '@concepta/nestjs-typeorm-ext';

// Used in every entity
export class ArtistEntity extends CommonPostgresEntity {
  // ...
}

// Used in every module
TypeOrmExtModule.forFeature({
  artist: { entity: ArtistEntity },
})
```

### **@concepta/nestjs-crud**
```typescript
// CRUD operations and controllers
import { 
  CrudService, 
  CrudController,
  CrudRequestInterface,
  TypeOrmCrudAdapter 
} from '@concepta/nestjs-crud';

// Used in every CRUD implementation
@CrudController({ path: 'artists' })
export class ArtistCrudController {}
```

### **@concepta/nestjs-access-control**
```typescript
// Role-based access control
import { 
  AccessControlModule,
  CanAccess,
  AccessControlQuery,
  AccessControlReadMany 
} from '@concepta/nestjs-access-control';

// Used for security on every endpoint
@AccessControlReadMany(ArtistResource.Many)
async getMany() {}
```

### **@concepta/typeorm-common**
```typescript
// TypeORM utilities and types
import { BaseEntity } from '@concepta/typeorm-common';

// Low-level TypeORM helpers
```

---

## 🔐 **Authentication Ecosystem (11 packages)**

Complete authentication system with multiple strategies:

### **Core Auth Packages**

#### **@concepta/nestjs-authentication**
```typescript
// Base authentication module
import { AuthenticationModule } from '@concepta/nestjs-authentication';

@Module({
  imports: [
    AuthenticationModule.forRoot({
      // Base auth configuration
    })
  ]
})
```

#### **@concepta/nestjs-jwt**
```typescript
// JWT token handling
import { JwtModule } from '@concepta/nestjs-jwt';

// JWT token generation and validation
JwtModule.forRoot({
  secretKey: process.env.JWT_SECRET,
  expiresIn: '1h',
})
```

### **Authentication Strategies**

#### **@concepta/nestjs-auth-local**
```typescript
// Username/password authentication
import { AuthLocalModule } from '@concepta/nestjs-auth-local';

AuthLocalModule.forRoot({
  loginDto: CustomLoginDto,
  settings: {
    usernameField: 'email',
    passwordField: 'password',
  }
})
```

#### **@concepta/nestjs-auth-jwt**
```typescript
// JWT authentication strategy
import { AuthJwtModule } from '@concepta/nestjs-auth-jwt';

AuthJwtModule.forRoot({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
})
```

### **OAuth Providers**

#### **@concepta/nestjs-auth-google**
```typescript
// Google OAuth authentication
import { AuthGoogleModule } from '@concepta/nestjs-auth-google';

AuthGoogleModule.forRoot({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
})
```

#### **@concepta/nestjs-auth-github**
```typescript
// GitHub OAuth authentication  
import { AuthGithubModule } from '@concepta/nestjs-auth-github';

AuthGithubModule.forRoot({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
})
```

#### **@concepta/nestjs-auth-apple**
```typescript
// Apple OAuth authentication
import { AuthAppleModule } from '@concepta/nestjs-auth-apple';

AuthAppleModule.forRoot({
  clientId: process.env.APPLE_CLIENT_ID,
  teamId: process.env.APPLE_TEAM_ID,
  keyId: process.env.APPLE_KEY_ID,
})
```

### **Auth Support Packages**

#### **@concepta/nestjs-auth-recovery**
```typescript
// Password recovery system
import { AuthRecoveryModule } from '@concepta/nestjs-auth-recovery';

AuthRecoveryModule.forRoot({
  email: {
    from: 'noreply@yourapp.com',
    subject: 'Password Recovery',
  }
})
```

#### **@concepta/nestjs-auth-refresh**
```typescript
// Refresh token handling
import { AuthRefreshModule } from '@concepta/nestjs-auth-refresh';

AuthRefreshModule.forRoot({
  expiresIn: '7d',
  issuer: 'your-app',
})
```

#### **@concepta/nestjs-auth-verify**
```typescript
// Email verification system
import { AuthVerifyModule } from '@concepta/nestjs-auth-verify';

AuthVerifyModule.forRoot({
  email: {
    from: 'noreply@yourapp.com',
    subject: 'Verify Your Email',
  }
})
```

#### **@concepta/nestjs-auth-router**
```typescript
// Auth route management
import { AuthRouterModule } from '@concepta/nestjs-auth-router';

AuthRouterModule.forRoot({
  routes: {
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
  }
})
```

---

## 🚀 **Feature Packages (16 packages)**

Add-on functionality for enhanced applications:

### **User & Organization Management**

#### **@concepta/nestjs-user**
```typescript
// User management system
import { UserModule } from '@concepta/nestjs-user';

UserModule.forRoot({
  entities: {
    user: UserEntity,
    userProfile: UserProfileEntity,
  }
})
```

#### **@concepta/nestjs-org**
```typescript
// Organization/tenant management
import { OrgModule } from '@concepta/nestjs-org';

OrgModule.forRoot({
  entities: {
    org: OrgEntity,
    orgMember: OrgMemberEntity,
  }
})
```

#### **@concepta/nestjs-role**
```typescript
// Role-based permissions
import { RoleModule } from '@concepta/nestjs-role';

RoleModule.forRoot({
  entities: {
    role: RoleEntity,
    userRole: UserRoleEntity,
  }
})
```

### **Security & Verification**

#### **@concepta/nestjs-otp**
```typescript
// One-time password (2FA)
import { OtpModule } from '@concepta/nestjs-otp';

OtpModule.forRoot({
  email: {
    from: 'noreply@yourapp.com',
    subject: 'Your OTP Code',
  },
  expiresIn: 300, // 5 minutes
})
```

#### **@concepta/nestjs-password**
```typescript
// Password hashing and validation
import { PasswordModule } from '@concepta/nestjs-password';

PasswordModule.forRoot({
  saltRounds: 12,
  minLength: 8,
  requireSpecialChar: true,
})
```

#### **@concepta/nestjs-federated**
```typescript
// Federated identity management
import { FederatedModule } from '@concepta/nestjs-federated';

FederatedModule.forRoot({
  providers: ['google', 'github', 'apple'],
})
```

### **Communication & Notifications**

#### **@concepta/nestjs-email**
```typescript
// Email service integration
import { EmailModule } from '@concepta/nestjs-email';

EmailModule.forRoot({
  transport: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }
})
```

#### **@concepta/nestjs-invitation**
```typescript
// User invitation system
import { InvitationModule } from '@concepta/nestjs-invitation';

InvitationModule.forRoot({
  email: {
    from: 'noreply@yourapp.com',
    subject: 'You are invited!',
  },
  expiresIn: '7d',
})
```

### **File & Data Management**

#### **@concepta/nestjs-file**
```typescript
// File upload and management
import { FileModule } from '@concepta/nestjs-file';

FileModule.forRoot({
  storage: {
    type: 's3',
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
  }
})
```

#### **@concepta/nestjs-cache**
```typescript
// Caching system
import { CacheModule } from '@concepta/nestjs-cache';

CacheModule.forRoot({
  store: 'redis',
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
})
```

#### **@concepta/nestjs-report**
```typescript
// Report generation
import { ReportModule } from '@concepta/nestjs-report';

ReportModule.forRoot({
  engines: ['pdf', 'excel', 'csv'],
  storage: 's3',
})
```

### **System & Monitoring**

#### **@concepta/nestjs-event**
```typescript
// Event system
import { EventModule } from '@concepta/nestjs-event';

EventModule.forRoot({
  emitters: ['database', 'http', 'custom'],
})
```

#### **@concepta/nestjs-logger**
```typescript
// Logging system
import { LoggerModule } from '@concepta/nestjs-logger';

LoggerModule.forRoot({
  level: 'info',
  format: 'json',
  transports: ['console', 'file'],
})
```

#### **@concepta/nestjs-logger-sentry**
```typescript
// Sentry error tracking
import { LoggerSentryModule } from '@concepta/nestjs-logger-sentry';

LoggerSentryModule.forRoot({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

#### **@concepta/nestjs-logger-coralogix**
```typescript
// Coralogix logging integration
import { LoggerCoralogixModule } from '@concepta/nestjs-logger-coralogix';

LoggerCoralogixModule.forRoot({
  privateKey: process.env.CORALOGIX_PRIVATE_KEY,
  applicationName: 'your-app',
})
```

### **Documentation & Development**

#### **@concepta/nestjs-swagger-ui**
```typescript
// Enhanced Swagger UI
import { SwaggerUiModule } from '@concepta/nestjs-swagger-ui';

SwaggerUiModule.forRoot({
  theme: 'dark',
  displayRequestDuration: true,
  docExpansion: 'none',
})
```

#### **@concepta/nestjs-samples**
```typescript
// Sample data and seeding
import { SamplesModule } from '@concepta/nestjs-samples';

SamplesModule.forRoot({
  samples: [UserSample, ArtistSample],
  autoSeed: process.env.NODE_ENV === 'development',
})
```

---

## 🔧 **Integration Patterns**

### **Basic Application Stack**
```typescript
// app.module.ts - Basic stack
@Module({
  imports: [
    // Core foundation
    TypeOrmModule.forRoot({...}),
    TypeOrmExtModule.forRoot({...}),
    
    // Basic auth
    AuthLocalModule.forRoot({...}),
    AuthJwtModule.forRoot({...}),
    
    // User management
    UserModule.forRoot({...}),
    RoleModule.forRoot({...}),
    
    // Your business modules
    ArtistModule,
    AlbumModule,
  ],
})
export class AppModule {}
```

### **Enterprise Application Stack**
```typescript
// app.module.ts - Enterprise stack
@Module({
  imports: [
    // Core foundation
    TypeOrmModule.forRoot({...}),
    TypeOrmExtModule.forRoot({...}),
    
    // Complete auth system
    AuthLocalModule.forRoot({...}),
    AuthJwtModule.forRoot({...}),
    AuthGoogleModule.forRoot({...}),
    AuthGithubModule.forRoot({...}),
    AuthRecoveryModule.forRoot({...}),
    AuthRefreshModule.forRoot({...}),
    
    // User & org management
    UserModule.forRoot({...}),
    OrgModule.forRoot({...}),
    RoleModule.forRoot({...}),
    
    // Security features
    OtpModule.forRoot({...}),
    PasswordModule.forRoot({...}),
    AccessControlModule.forRoot({...}),
    
    // Communication
    EmailModule.forRoot({...}),
    InvitationModule.forRoot({...}),
    
    // File & data
    FileModule.forRoot({...}),
    CacheModule.forRoot({...}),
    
    // Monitoring
    LoggerModule.forRoot({...}),
    LoggerSentryModule.forRoot({...}),
    EventModule.forRoot({...}),
    
    // Documentation
    SwaggerUiModule.forRoot({...}),
    
    // Your business modules
    ArtistModule,
    AlbumModule,
    SongModule,
  ],
})
export class AppModule {}
```

### **Package Dependencies Map**
```
Core Foundation (Required)
├── @concepta/nestjs-common
├── @concepta/nestjs-typeorm-ext
├── @concepta/nestjs-crud
├── @concepta/nestjs-access-control
└── @concepta/typeorm-common

Authentication (Optional but Recommended)
├── @concepta/nestjs-authentication
├── @concepta/nestjs-jwt
├── @concepta/nestjs-auth-local
├── @concepta/nestjs-auth-jwt
└── OAuth Providers (Optional)
    ├── @concepta/nestjs-auth-google
    ├── @concepta/nestjs-auth-github
    └── @concepta/nestjs-auth-apple

Features (Add as Needed)
├── User Management
│   ├── @concepta/nestjs-user
│   ├── @concepta/nestjs-role
│   └── @concepta/nestjs-org
├── Security
│   ├── @concepta/nestjs-otp
│   ├── @concepta/nestjs-password
│   └── @concepta/nestjs-federated
├── Communication
│   ├── @concepta/nestjs-email
│   └── @concepta/nestjs-invitation
└── System Features
    ├── @concepta/nestjs-file
    ├── @concepta/nestjs-cache
    ├── @concepta/nestjs-event
    ├── @concepta/nestjs-logger
    └── @concepta/nestjs-report
```

---

## 📦 **Package Installation Guide**

### **Core Only (Minimal)**
```bash
yarn add @concepta/nestjs-common @concepta/nestjs-typeorm-ext \
  @concepta/nestjs-crud @concepta/nestjs-access-control
```

### **With Basic Auth**
```bash
yarn add @concepta/nestjs-common @concepta/nestjs-typeorm-ext \
  @concepta/nestjs-crud @concepta/nestjs-access-control \
  @concepta/nestjs-authentication @concepta/nestjs-jwt \
  @concepta/nestjs-auth-local @concepta/nestjs-auth-jwt
```

### **Complete Enterprise Setup**
```bash
# Core foundation
yarn add @concepta/nestjs-common @concepta/nestjs-typeorm-ext \
  @concepta/nestjs-crud @concepta/nestjs-access-control

# Authentication
yarn add @concepta/nestjs-authentication @concepta/nestjs-jwt \
  @concepta/nestjs-auth-local @concepta/nestjs-auth-jwt \
  @concepta/nestjs-auth-google @concepta/nestjs-auth-github \
  @concepta/nestjs-auth-recovery @concepta/nestjs-auth-refresh

# User management
yarn add @concepta/nestjs-user @concepta/nestjs-role \
  @concepta/nestjs-org

# Security & features
yarn add @concepta/nestjs-otp @concepta/nestjs-password \
  @concepta/nestjs-email @concepta/nestjs-file

# Monitoring
yarn add @concepta/nestjs-logger @concepta/nestjs-event \
  @concepta/nestjs-swagger-ui
```

---

## 🎯 **Common Integration Scenarios**

### **Scenario 1: E-commerce Application**
```typescript
// Recommended packages
@concepta/nestjs-common           // Core utilities
@concepta/nestjs-typeorm-ext      // Database layer
@concepta/nestjs-crud            // Product CRUD
@concepta/nestjs-access-control  // Admin/customer roles
@concepta/nestjs-auth-local      // Customer login
@concepta/nestjs-user            // Customer management
@concepta/nestjs-email           // Order confirmations
@concepta/nestjs-file            // Product images
@concepta/nestjs-cache           // Product caching
```

### **Scenario 2: SaaS Application**
```typescript
// Recommended packages
@concepta/nestjs-common           // Core utilities
@concepta/nestjs-typeorm-ext      // Database layer
@concepta/nestjs-crud            // Feature CRUD
@concepta/nestjs-access-control  // Multi-tenant security
@concepta/nestjs-auth-local      // User login
@concepta/nestjs-auth-google     // SSO login
@concepta/nestjs-org             // Organization management
@concepta/nestjs-user            // User management
@concepta/nestjs-role            // Role management
@concepta/nestjs-invitation      // Team invites
@concepta/nestjs-otp             // 2FA security
```

### **Scenario 3: Internal Tool**
```typescript
// Recommended packages
@concepta/nestjs-common           // Core utilities
@concepta/nestjs-typeorm-ext      // Database layer
@concepta/nestjs-crud            // Data CRUD
@concepta/nestjs-access-control  // Role permissions
@concepta/nestjs-auth-local      // Employee login
@concepta/nestjs-user            // Employee management
@concepta/nestjs-report          // Data reports
@concepta/nestjs-logger          // Audit logging
```

---

## ⚡ **Best Practices**

### **Package Selection Guidelines**
1. **Start with Core**: Always include the 5 core foundation packages
2. **Add Auth**: Include authentication packages based on your needs
3. **Feature Driven**: Only add feature packages you actually need
4. **Monitor Bundle Size**: Too many packages can increase startup time

### **Configuration Patterns**
```typescript
// Centralized configuration
export const appConfig = {
  auth: {
    jwt: { secret: process.env.JWT_SECRET },
    google: { clientId: process.env.GOOGLE_CLIENT_ID },
  },
  email: {
    smtp: { host: process.env.SMTP_HOST },
  },
  features: {
    otp: { enabled: true },
    invitation: { enabled: true },
  }
};
```

### **Environment Variables**
```bash
# Core database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret

# Email
SMTP_HOST=smtp.yourprovider.com
SMTP_USER=your-email
SMTP_PASS=your-password

# File storage
S3_BUCKET=your-bucket
S3_REGION=us-east-1

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

---

## 🚀 **Next Steps**

After understanding the package ecosystem:

1. **📖 Read [ROCKETS_PACKAGES_GUIDE.md](./ROCKETS_PACKAGES_GUIDE.md)** - Choose your core rockets packages
2. **📖 Read [CONFIGURATION_GUIDE.md](./CONFIGURATION_GUIDE.md)** - Configure your selected packages
3. **Use `rockets-crud-generator` skill** - Generate business modules

**🎯 Build powerful applications with the complete @concepta ecosystem!**