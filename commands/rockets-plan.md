---
description: Plan a Rockets SDK feature with architecture, module structure, ACL, and implementation phases. WAIT for user confirmation before writing code.
---

# Rockets Plan Command

Invokes the **rockets-planner** agent to create a Rockets-specific implementation plan.

## What This Command Does

1. **Read `CLAUDE.md`** and `development-guides/ROCKETS_AI_INDEX.md` for context
2. **Analyze the request** against existing Rockets architecture
3. **Plan module structure** following the 12-file pattern
4. **Design access control** (roles, resources, permissions)
5. **Break into phases** (entity → interfaces → DTOs → services → controller → integration)
6. **WAIT for confirmation** before any code changes

## Source of Truth

- `CLAUDE.md`
- `development-guides/ROCKETS_AI_INDEX.md`
- `development-guides/CRUD_PATTERNS_GUIDE.md`
- `development-guides/ACCESS_CONTROL_GUIDE.md`
- `development-guides/SBVR_EXTRACTION_GUIDE.md` (when the source is SBVR)

## When to Use

- Starting a new feature module
- Adding endpoints to existing modules
- Making architectural changes
- Complex refactoring across multiple modules
- Adding new roles or resources to ACL

## How It Works

The planner will:
1. Check existing modules and ACL configuration
2. Identify which Concepta packages are needed
3. Plan the 12-file module structure
4. Design ACL rules and Access Query Service logic
5. Present the plan for approval

## After Planning

- Use `/rockets-module` to generate the module files
- Use `/rockets-acl` to configure access control
- Use `/rockets-test` to write tests
- Use `/rockets-build-fix` if build errors occur
