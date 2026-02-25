---
description: Run tests and enforce TDD workflow for Rockets SDK projects. Writes tests for Access Query Services, Model Services, and CRUD controllers.
---

# Rockets Test Command

Invokes the **rockets-tdd-guide** agent for test-driven development.

## What This Command Does

1. **Identify what needs tests** — scan recent changes or specified module
2. **Write tests first** (TDD) or **add tests** for existing code
3. **Run tests** and verify they pass
4. **Check coverage** for critical components

## Source of Truth

- `development-guides/TESTING_GUIDE.md`
- `CLAUDE.md`

Detailed test structure and checklists should stay in the testing guide, not duplicated here.

## Usage

```
/rockets-test                          # Test recent changes
/rockets-test ProductModule            # Test specific module
/rockets-test access-query Product     # Test Product Access Query Service
```

## Priority Testing

1. **Access Query Services** — permission scenarios (allow, deny, ownership)
2. **Model Services** — business logic, computed fields
3. **Controllers (E2E)** — CRUD operations, auth, ACL enforcement
4. **DTOs** — validation rules

## Test Commands

```bash
yarn test                    # All unit tests
yarn test:e2e                # E2E tests
yarn test --coverage         # With coverage report
yarn test --watch            # Watch mode
```
