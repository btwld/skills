# Agent Teams Guide

> Auto-formation of agent teams for parallel execution in Rockets SDK projects.
> Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` enabled in plugin settings.

## When to Form Teams

| Task Pattern | Form Team? | Reason |
|-------------|-----------|--------|
| Full project from spec (`/rockets-from-doc`) | YES | Multi-entity parallel gen + review |
| 3+ entities at once | YES | Wave-based parallel generation |
| Single entity (`/rockets-module`) | NO | Scripts handle it, one-shot |
| Code review (`/rockets-review`) | NO | Single agent sufficient |
| Build fix (`/rockets-build-fix`) | NO | Sequential debug loop |
| Planning only (`/rockets-plan`) | NO | Single planner sufficient |

## Team Composition

| Role | Agent File | Model | Spawned When |
|------|-----------|-------|-------------|
| Lead | rockets-planner | opus | Always — parses spec, creates tasks, coordinates |
| Generator | rockets-module-generator | sonnet | Per wave — runs generate.js + integrate.js |
| Reviewer | rockets-auto-reviewer | haiku | After each wave — validates 9 engineering rules |
| Tester | (inline) | sonnet | After all waves — validate.js + smoke-test |
| Builder | rockets-build-resolver | sonnet | Only on build failure — fix + retry (max 3) |

## Communication Rules

- Reviewer → Generator: direct fix requests (skip Lead roundtrip)
- Builder → Lead: report after max retries exhausted
- Tester blocks next wave until current passes
- Lead synthesizes final report to user

## Task Dependencies

Tasks use `blockedBy` matching the topological sort from plan.json:
- Wave 0 entities: no blockers
- Wave N entities: blocked by Wave N-1 completion
- Review tasks: blocked by their wave's generation tasks
- Final smoke test: blocked by all generation + review tasks
