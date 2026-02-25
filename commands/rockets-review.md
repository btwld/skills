---
description: Review code changes against Rockets SDK patterns, access control, and NestJS best practices. Checks module structure, DTOs, security, and TypeScript quality.
---

# Rockets Review Command

Invokes the **rockets-code-reviewer** agent to review recent code changes.

## What This Command Does

1. Run `git diff` to identify changed files
2. Review against Rockets module patterns (12-file structure)
3. Check access control configuration (ACL, guards, Access Query Service)
4. Verify DTO validation and exposure patterns
5. Check TypeScript quality (no `any`, proper types)
6. Report issues by priority (Critical, High, Medium)

## Source of Truth

Detailed review checklists live in:

- `development-guides/CRUD_PATTERNS_GUIDE.md`
- `development-guides/DTO_PATTERNS_GUIDE.md`
- `development-guides/ACCESS_CONTROL_GUIDE.md`
- `CLAUDE.md`

## When to Use

- After creating a new module
- After modifying access control
- After adding new endpoints
- Before committing changes
- Before creating a pull request
