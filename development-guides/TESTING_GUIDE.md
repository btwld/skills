# 🧪 TESTING GUIDE

> **For AI Tools**: This guide documents testing patterns from Rockets SDK packages. Use this when generating tests for new modules, services, and controllers.

## 📋 **Quick Reference**

| Task | Section | Time |
|------|---------|------|
| Setup test file structure | [File Organization](#file-organization) | 5 min |
| Create service unit test | [Service Test Template](#unit-test-template---service) | 10 min |
| Create controller unit test | [Controller Test Template](#unit-test-template---controller) | 10 min |
| Create e2e test | [E2E Test Template](#e2e-test-template) | 15 min |
| Create fixtures | [Fixtures Patterns](#fixtures-patterns) | 10 min |
| Understand naming conventions | [Naming Conventions](#naming-conventions) | 5 min |

---

## 🎯 **Overview**

### **Why Testing Matters**

Testing in Rockets SDK ensures:
- **Reliability**: Code works as expected
- **Maintainability**: Refactoring with confidence
- **Documentation**: Tests serve as living documentation
- **Quality**: Catches bugs before production

### **Testing Pyramid**

```
         /\
        /  \  E2E Tests (10%)
       /____\
      /      \  Integration Tests (20%)
     /________\
    /          \  Unit Tests (70%)
   /____________\
```

### **Coverage Expectations**

- **Services**: 90%+ coverage
- **Controllers**: 85%+ coverage
- **Guards/Interceptors**: 95%+ coverage
- **E2E Tests**: Critical user flows

---

## 📂 **File Organization**

### **Pattern from Rockets SDK Packages**

```
packages/rockets-server-auth/src/
├── __fixtures__/                       # Test fixtures directory
│   ├── user/
│   │   ├── user.entity.fixture.ts     # Entity fixtures
│   │   ├── user-model.service.fixture.ts
│   │   └── dto/
│   │       ├── user.dto.fixture.ts
│   │       ├── user-create.dto.fixture.ts
│   │       └── user-update.dto.fixture.ts
│   ├── role/
│   │   ├── role.entity.fixture.ts
│   │   └── user-role.entity.fixture.ts
│   ├── services/
│   │   ├── issue-token.service.fixture.ts
│   │   └── verify-token.service.fixture.ts
│   ├── ormconfig.fixture.ts           # DB config for tests
│   └── global.module.fixture.ts       # Global test module
│
├── services/
│   ├── rockets-auth-otp.service.ts
│   └── rockets-auth-otp.service.spec.ts    # ✅ Co-located unit test
│
├── domains/auth/controllers/
│   ├── auth-password.controller.ts
│   └── auth-password.controller.spec.ts    # ✅ Co-located unit test
│
└── rockets-auth.e2e-spec.ts               # ✅ E2E test at module level
```

### **Key Principles**

1. **Co-location**: Unit tests live next to the files they test
2. **Centralized Fixtures**: All fixtures in `__fixtures__/` directory
3. **Organized by Domain**: Fixtures mirror the source structure
4. **Shared Test Config**: `ormconfig.fixture.ts`, `global.module.fixture.ts`

---

## 🏷️ **Naming Conventions**

### **Test Files**

| Type | Pattern | Example |
|------|---------|---------|
| Unit Test | `{filename}.spec.ts` | `pet-model.service.spec.ts` |
| E2E Test | `{filename}.e2e-spec.ts` | `pet-crud.e2e-spec.ts` |
| Fixture | `{filename}.fixture.ts` | `pet.entity.fixture.ts` |

**When you add a new ModelService**, add a corresponding **`{entity}-model.service.spec.ts`** (e.g. `task-model.service.spec.ts`) so business logic and custom methods are covered from the first round.

### **Describe Blocks**

**Pattern from Rockets SDK:**

```typescript
describe(ClassName.name, () => {                        // Main describe
  describe(ClassName.prototype.methodName, () => {      // Per method
    it('should perform action when condition', () => { // Test case
      // ...
    });
  });
});
```

**Real Example from `rockets-auth-otp.service.spec.ts`:**

```typescript
describe(RocketsAuthOtpService.name, () => {
  describe(RocketsAuthOtpService.prototype.sendOtp, () => {
    it('should send OTP when user exists', async () => {
      // Test implementation
    });
  });
  
  describe(RocketsAuthOtpService.prototype.confirmOtp, () => {
    it('should confirm OTP successfully when user exists and OTP is valid', async () => {
      // Test implementation
    });
  });
});
```

**Why use `.name` and `.prototype`?**
- **Type-safe**: Refactoring class/method names updates tests automatically
- **Consistent**: Easy to search and find tests
- **Clear**: Immediately identifies what's being tested

---

## 🧪 **Unit Test Template - Service**

Based on `packages/rockets-server-auth/src/services/rockets-auth-otp.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from './service-name.service';
import { DependencyInterface } from '../interfaces/dependency.interface';

describe(ServiceName.name, () => {
  let service: ServiceName;
  let mockDependency: jest.Mocked<DependencyInterface>;

  // Mock data constants
  const mockEntity = {
    id: 'entity-123',
    name: 'Test Entity',
    email: 'test@example.com',
    dateCreated: new Date(),
    dateUpdated: new Date(),
    dateDeleted: null,
    version: 1,
  };

  beforeEach(async () => {
    // Create type-safe mocks
    mockDependency = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: DependencyInterface,
          useValue: mockDependency,
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(ServiceName.prototype.findById, () => {
    it('should return entity when found', async () => {
      // Arrange
      const id = 'entity-123';
      mockDependency.findOne.mockResolvedValue(mockEntity);

      // Act
      const result = await service.findById(id);

      // Assert
      expect(mockDependency.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockEntity);
    });

    it('should return null when entity not found', async () => {
      // Arrange
      const id = 'non-existent';
      mockDependency.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById(id);

      // Assert
      expect(mockDependency.findOne).toHaveBeenCalledWith(id);
      expect(result).toBeNull();
    });

    it('should throw error when dependency fails', async () => {
      // Arrange
      const id = 'entity-123';
      const error = new Error('Database error');
      mockDependency.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(service.findById(id)).rejects.toThrow('Database error');
      expect(mockDependency.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe(ServiceName.prototype.create, () => {
    it('should create entity with valid data', async () => {
      // Arrange
      const createDto = { name: 'New Entity', email: 'new@example.com' };
      mockDependency.create.mockResolvedValue({ ...mockEntity, ...createDto });

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(mockDependency.create).toHaveBeenCalledWith(createDto);
      expect(result.name).toBe(createDto.name);
    });

    it('should throw error when validation fails', async () => {
      // Arrange
      const invalidDto = { name: '' };
      mockDependency.create.mockRejectedValue(new Error('Validation failed'));

      // Act & Assert
      await expect(service.create(invalidDto)).rejects.toThrow('Validation failed');
    });
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all required dependencies injected', () => {
      expect(service).toBeInstanceOf(ServiceName);
    });
  });
});
```

---

## 🎮 **Unit Test Template - Controller**

Based on `packages/rockets-server-auth/src/domains/auth/controllers/auth-password.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ControllerName } from './controller-name.controller';
import { ServiceName } from '../services/service-name.service';
import { EntityInterface } from '../interfaces/entity.interface';

describe(ControllerName.name, () => {
  let controller: ControllerName;
  let mockService: jest.Mocked<ServiceName>;

  const mockEntity: EntityInterface = {
    id: 'entity-123',
    name: 'Test Entity',
    email: 'test@example.com',
    dateCreated: new Date(),
    dateUpdated: new Date(),
    version: 1,
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ControllerName],
      providers: [
        {
          provide: ServiceName,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ControllerName>(ControllerName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(ControllerName.prototype.findOne, () => {
    it('should return entity when found', async () => {
      // Arrange
      const id = 'entity-123';
      mockService.findOne.mockResolvedValue(mockEntity);

      // Act
      const result = await controller.findOne(id);

      // Assert
      expect(mockService.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockEntity);
    });

    it('should throw error when entity not found', async () => {
      // Arrange
      const id = 'non-existent';
      mockService.findOne.mockRejectedValue(new Error('Not found'));

      // Act & Assert
      await expect(controller.findOne(id)).rejects.toThrow('Not found');
      expect(mockService.findOne).toHaveBeenCalledWith(id);
    });

    it('should handle service errors', async () => {
      // Arrange
      const id = 'entity-123';
      const error = new Error('Service error');
      mockService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(id)).rejects.toThrow('Service error');
      expect(mockService.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe(ControllerName.prototype.create, () => {
    it('should create entity successfully', async () => {
      // Arrange
      const createDto = { name: 'New Entity', email: 'new@example.com' };
      mockService.create.mockResolvedValue({ ...mockEntity, ...createDto });

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(mockService.create).toHaveBeenCalledWith(createDto);
      expect(result.name).toBe(createDto.name);
    });
  });

  describe('controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have all CRUD methods', () => {
      expect(controller.findAll).toBeDefined();
      expect(controller.findOne).toBeDefined();
      expect(controller.create).toBeDefined();
      expect(controller.update).toBeDefined();
      expect(controller.remove).toBeDefined();
    });
  });
});
```

---

## 🌐 **E2E Test Template**

Based on `packages/rockets-server-auth/src/rockets-auth.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ExceptionsFilter } from '@bitwild/rockets';

describe('EntityName CRUD (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let entityId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply global pipes and filters (match production)
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new ExceptionsFilter(httpAdapterHost));
    
    await app.init();

    // Authenticate to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'test@example.com',
        password: 'password',
      })
      .expect(201);
    
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /entities', () => {
    it('should create entity successfully with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/entities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Entity',
          description: 'Test Description',
        })
        .expect(201);

      expect(response.body.name).toBe('Test Entity');
      expect(response.body.id).toBeDefined();
      entityId = response.body.id;
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/entities')
        .send({
          name: 'Test Entity',
        })
        .expect(401);
    });

    it('should return 400 with invalid data', async () => {
      await request(app.getHttpServer())
        .post('/entities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid: empty name
        })
        .expect(400);
    });
  });

  describe('GET /entities', () => {
    it('should return all entities', async () => {
      const response = await request(app.getHttpServer())
        .get('/entities')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/entities')
        .expect(401);
    });
  });

  describe('GET /entities/:id', () => {
    it('should return entity by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/entities/${entityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(entityId);
      expect(response.body.name).toBe('Test Entity');
    });

    it('should return 404 for non-existent entity', async () => {
      await request(app.getHttpServer())
        .get('/entities/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /entities/:id', () => {
    it('should update entity successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/entities/${entityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Entity',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Entity');
    });
  });

  describe('DELETE /entities/:id', () => {
    it('should delete entity successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/entities/${entityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/entities/${entityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
```

---

## 🎭 **Fixtures Patterns**

### **Entity Fixture**

Based on `packages/rockets-server-auth/src/__fixtures__/user/user.entity.fixture.ts`

```typescript
// __fixtures__/entity/entity.fixture.ts
import { CommonSqliteEntity } from '@concepta/typeorm-common';
import { Entity, Column, OneToMany } from 'typeorm';

/**
 * Entity Fixture for Testing
 * 
 * Extends the appropriate base entity (Sqlite, Postgres, etc.)
 * and includes only fields needed for testing.
 */
@Entity()
export class EntityFixture extends CommonSqliteEntity {
  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  userId!: string;

  @OneToMany(() => RelatedEntityFixture, (related) => related.entity)
  relatedEntities?: RelatedEntityFixture[];
}
```

### **DTO Fixture**

```typescript
// __fixtures__/entity/dto/entity.dto.fixture.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { EntityDto } from '../../../dto/entity.dto';
import { EntityMetadataFixtureDto } from './entity-metadata.dto.fixture';

/**
 * Entity DTO Fixture
 * 
 * Extends EntityDto with test-specific fields.
 */
export class EntityDtoFixture extends EntityDto {
  @ApiProperty({ type: EntityMetadataFixtureDto, required: false })
  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => EntityMetadataFixtureDto)
  metadata?: EntityMetadataFixtureDto;
}
```

### **Service Fixture**

```typescript
// __fixtures__/services/entity-model.service.fixture.ts
import { EntityModelServiceInterface } from '../../interfaces/entity-model-service.interface';

/**
 * Entity Model Service Fixture
 * 
 * Implements the service interface with jest.fn() methods
 * for testing purposes.
 */
export class EntityModelServiceFixture implements EntityModelServiceInterface {
  byId = jest.fn();
  byName = jest.fn();
  find = jest.fn();
  create = jest.fn();
  update = jest.fn();
  remove = jest.fn();
}
```

### **ORM Config Fixture**

```typescript
// __fixtures__/ormconfig.fixture.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * TypeORM configuration for testing
 * Uses in-memory SQLite database
 */
export const ormConfig: TypeOrmModuleOptions = {
  type: 'better-sqlite3',
  database: ':memory:',
  synchronize: true,
  dropSchema: true,
  logging: false,
  entities: [], // Will be populated by tests
};
```

### **Global Module Fixture**

```typescript
// __fixtures__/global.module.fixture.ts
import { Global, Module } from '@nestjs/common';

/**
 * Global Module Fixture
 * 
 * Provides commonly needed test dependencies globally
 * to avoid repetition in test setup.
 */
@Global()
@Module({
  providers: [
    // Global test providers
  ],
  exports: [
    // Exported providers
  ],
})
export class GlobalModuleFixture {}
```

---

## 🛠️ **Mock Patterns**

### **Type-Safe Mocks**

```typescript
// ✅ Preferred: Type-safe mock with jest.Mocked
let mockService: jest.Mocked<ServiceInterface>;
mockService = {
  method1: jest.fn(),
  method2: jest.fn(),
  method3: jest.fn(),
} as any;

// Access with full type safety
mockService.method1.mockResolvedValue(result);
```

### **Mock Return Values**

```typescript
// Success case
mockService.findOne.mockResolvedValue(entity);

// Error case
mockService.findOne.mockRejectedValue(new Error('Not found'));

// Return null
mockService.findOne.mockResolvedValue(null);

// Conditional mocking
mockService.findOne.mockImplementation(async (id) => {
  if (id === 'valid-id') return entity;
  if (id === 'invalid-id') throw new Error('Not found');
  return null;
});

// Multiple calls with different results
mockService.findOne
  .mockResolvedValueOnce(entity1)
  .mockResolvedValueOnce(entity2)
  .mockResolvedValue(entity3); // All subsequent calls
```

### **Spy on Methods**

```typescript
it('should call internal method', async () => {
  // Spy on a method
  const spy = jest.spyOn(service, 'internalMethod');
  
  await service.publicMethod();
  
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(expectedArg);
  
  spy.mockRestore(); // Clean up
});
```

---

## 📐 **AAA Pattern (Arrange-Act-Assert)**

**Always structure tests in three clear phases:**

```typescript
it('should update entity when valid data provided', async () => {
  // ========================================
  // Arrange - Setup test data and mocks
  // ========================================
  const entityId = 'entity-123';
  const updateData = { name: 'Updated Name', description: 'New description' };
  const updatedEntity = { ...mockEntity, ...updateData };
  
  mockRepository.update.mockResolvedValue({ affected: 1 });
  mockRepository.findOne.mockResolvedValue(updatedEntity);

  // ========================================
  // Act - Execute the method being tested
  // ========================================
  const result = await service.update(entityId, updateData);

  // ========================================
  // Assert - Verify the outcome
  // ========================================
  expect(mockRepository.update).toHaveBeenCalledWith(entityId, updateData);
  expect(mockRepository.findOne).toHaveBeenCalledWith(entityId);
  expect(result).toEqual(updatedEntity);
  expect(result.name).toBe('Updated Name');
});
```

**Benefits of AAA:**
- **Readability**: Clear test structure
- **Maintainability**: Easy to modify
- **Debugging**: Quick to identify failing phase

---

## 🎯 **Test Categories**

### **1. Happy Path (Success Cases)**

Test that things work when everything is correct:

```typescript
it('should return entity when valid id provided', async () => {
  // Test successful operation
});

it('should create entity with valid data', async () => {
  // Test successful creation
});
```

### **2. Error Handling**

Test that errors are handled properly:

```typescript
it('should throw error when dependency fails', async () => {
  // Test error propagation
});

it('should throw NotFoundException when entity not found', async () => {
  // Test specific exceptions
});

it('should throw ValidationException when data is invalid', async () => {
  // Test validation errors
});
```

### **3. Edge Cases**

Test boundary conditions:

```typescript
it('should return empty array when no results found', async () => {
  // Test empty results
});

it('should handle null input gracefully', async () => {
  // Test null handling
});

it('should handle undefined fields in DTO', async () => {
  // Test optional fields
});
```

### **4. Constructor/Instantiation**

Test that dependencies are injected correctly:

```typescript
describe('constructor', () => {
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have all required dependencies injected', () => {
    expect(service).toBeInstanceOf(ServiceName);
  });

  it('should initialize with correct configuration', () => {
    expect(service.config).toBeDefined();
  });
});
```

---

## 📊 **Coverage Expectations**

### **Services**
- **Target**: 90%+ coverage
- **Focus**: All public methods, error cases, edge cases
- **Skip**: Private methods (test through public interface)

### **Controllers**
- **Target**: 85%+ coverage
- **Focus**: All endpoints, error handling, authentication
- **Skip**: Decorators (tested through e2e)

### **Guards/Interceptors**
- **Target**: 95%+ coverage
- **Focus**: All conditions, error scenarios
- **Critical**: Security-related code must be fully tested

### **E2E Tests**
- **Target**: All critical user flows
- **Focus**: Authentication, CRUD operations, access control
- **Include**: Role-based access, error responses, validation

---

## 🏃 **Running Tests**

### **Commands**

```bash
# Run all unit tests
yarn test

# Run unit tests in watch mode
yarn test:watch

# Run unit tests with coverage
yarn test:cov

# Run e2e tests
yarn test:e2e

# Run specific test file
yarn test pet-model.service.spec.ts

# Run tests matching pattern
yarn test --testNamePattern="findById"
```

### **Coverage Report**

```bash
# Generate coverage report
yarn test:cov

# View coverage in browser
open coverage/lcov-report/index.html
```

### **Debugging Tests**

```typescript
// Add .only to run single test
it.only('should test specific case', () => {
  // Only this test runs
});

// Add .skip to skip test
it.skip('should test later', () => {
  // This test is skipped
});

// Use console.log for debugging
it('should debug test', () => {
  console.log('Debug value:', value);
  expect(value).toBe(expected);
});
```

---

## 🤖 **AI Code Generation Templates**

### **For AI Tools - Generate Unit Test for Service**

```
Create a unit test for {ServiceName} following Rockets SDK patterns.

Requirements:
- Read TESTING_GUIDE.md section on Unit Test Template - Service
- Use describe(ClassName.name) for main describe block
- Use describe(ClassName.prototype.methodName) for each public method
- Follow AAA pattern (Arrange-Act-Assert) with comments
- Use jest.Mocked<Interface> for type-safe mocks
- Include beforeEach/afterEach with jest.clearAllMocks()
- Test happy path, error cases, and edge cases for each method
- Add constructor tests at the end
- Mock all dependencies

Service to test: {ServiceName}
Dependencies: {list of dependencies}
Public methods: {list of methods}
```

### **For AI Tools - Generate Unit Test for Controller**

```
Create a unit test for {ControllerName} following Rockets SDK patterns.

Requirements:
- Read TESTING_GUIDE.md section on Unit Test Template - Controller
- Use describe(ClassName.name) format
- Mock the service layer completely
- Test all HTTP endpoints
- Include error handling tests
- Test authentication/authorization if applicable
- Follow AAA pattern

Controller to test: {ControllerName}
Service dependency: {ServiceName}
Endpoints: {list of endpoints}
```

### **For AI Tools - Generate E2E Test**

```
Create an e2e test for {EntityName} CRUD operations following Rockets SDK patterns.

Requirements:
- Read TESTING_GUIDE.md section on E2E Test Template
- Test POST, GET, PATCH, DELETE endpoints
- Include authentication with Bearer token
- Test success cases and error cases (401, 404, 400)
- Verify response status codes and body structure
- Test role-based access if applicable
- Follow the pattern from rockets-auth.e2e-spec.ts

Entity: {EntityName}
Endpoints: /entities, /entities/:id
Authentication: Required
Roles: {list of roles if applicable}
```

### **For AI Tools - Generate Fixtures**

```
Create test fixtures for {EntityName} following Rockets SDK patterns.

Requirements:
- Create entity fixture extending appropriate base entity
- Create DTO fixtures for create/update operations
- Place fixtures in __fixtures__/{entity-name}/ directory
- Follow naming convention: {filename}.fixture.ts
- Use Sqlite entities for tests
- Include relationships if applicable

Entity: {EntityName}
Fields: {list of fields}
Relationships: {list of relationships}
```

---

## 📚 **Real Examples from Rockets SDK**

### **Service Test Example**
- File: `packages/rockets-server-auth/src/services/rockets-auth-otp.service.spec.ts`
- Tests: OTP generation, validation, error handling
- Mocks: UserModelService, OtpService, NotificationService

### **Controller Test Example**
- File: `packages/rockets-server-auth/src/domains/auth/controllers/auth-password.controller.spec.ts`
- Tests: Login endpoint, error handling
- Mocks: IssueTokenService

### **E2E Test Example**
- File: `packages/rockets-server-auth/src/rockets-auth.e2e-spec.ts`
- Tests: Complete auth flow, protected routes
- Setup: Full app initialization, JWT authentication

### **Module Test Example**
- File: `packages/rockets-server-auth/src/rockets-auth.module.spec.ts`
- Tests: Module configuration, service injection
- Setup: forRoot, forRootAsync patterns

---

## ✅ **Testing Checklist**

Before committing code, verify:

- [ ] All public methods have unit tests
- [ ] Happy path tested for each method
- [ ] Error cases tested
- [ ] Edge cases covered (null, undefined, empty)
- [ ] Constructor tests included
- [ ] Type-safe mocks used (`jest.Mocked<Interface>`)
- [ ] AAA pattern followed in all tests
- [ ] `describe` blocks use `.name` and `.prototype`
- [ ] `beforeEach` and `afterEach` implemented
- [ ] `jest.clearAllMocks()` in afterEach
- [ ] Coverage meets expectations (90%+ services)
- [ ] E2E tests for critical flows
- [ ] All tests pass (`yarn test`)
- [ ] No console.log statements left in tests

---

## 🎓 **Best Practices**

### **DO**
- ✅ Use type-safe mocks with `jest.Mocked<Interface>`
- ✅ Follow AAA pattern consistently
- ✅ Test one thing per test case
- ✅ Use descriptive test names: "should do X when Y"
- ✅ Mock external dependencies
- ✅ Clear mocks between tests
- ✅ Test error cases as thoroughly as success cases
- ✅ Use fixtures for reusable test data

### **DON'T**
- ❌ Test implementation details
- ❌ Use real database in unit tests
- ❌ Make network calls in unit tests
- ❌ Share state between tests
- ❌ Use setTimeout in tests (use jest fake timers)
- ❌ Test private methods directly
- ❌ Skip writing tests for "simple" code
- ❌ Leave debug console.log statements

---

## 🔗 **Related Guides**

- [CRUD_PATTERNS_GUIDE.md](./CRUD_PATTERNS_GUIDE.md) - CRUD implementation patterns
- [ACCESS_CONTROL_GUIDE.md](./ACCESS_CONTROL_GUIDE.md) - Testing access control
- [DTO_PATTERNS_GUIDE.md](./DTO_PATTERNS_GUIDE.md) - DTO validation testing
- [ROCKETS_AI_INDEX.md](./ROCKETS_AI_INDEX.md) - Navigation hub

---

**🎯 Remember**: Good tests are an investment, not a cost. They save time by catching bugs early and serve as living documentation for your code.

