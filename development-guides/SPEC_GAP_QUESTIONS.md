# Spec Gap Questions Reference

> When the planner detects gaps in a spec (missing technology choices, ambiguous business rules, undefined edge cases, or implied seed data), it must ask the user BEFORE writing plan.json. This guide defines the triggers, question templates, output format, and answer-to-plan mapping.

## A. Technology Choices

Ask when a rule type is identified but the spec does not specify which library or provider to use.

| Rule Type | Trigger | Question Template | Options |
|---|---|---|---|
| `background-job` | Rule requires background/async processing and spec does not name a scheduler | "Rule [X] requires background processing. Which scheduler?" | A) `@nestjs/schedule` (simple cron, no persistence) / B) `bull` + `@nestjs/bull` (queue + Redis) / C) `bullmq` + `@nestjs/bullmq` (modern queue + Redis) |
| `notification` (email) | Rule requires email sending and spec does not name a provider | "Rules [X] require email notifications. Which provider?" | A) `nodemailer` + SMTP / B) SendGrid / C) AWS SES / D) Resend |
| `notification` (in-app) | Rule implies notifications beyond email but spec is not explicit | "Are in-app push notifications needed beyond email?" | A) Email only / B) Email + in-app (specify: Firebase, Pusher, custom WS) |
| `file-upload` | Rule requires file storage and spec does not name a destination | "Rule [X] requires file storage. Where should files be stored?" | A) Local disk (dev only) / B) AWS S3 / C) Google Cloud Storage / D) Cloudflare R2 |
| `api-integration` | Rule calls external API and spec does not define failure behavior | "Rule [X] calls external API. How to handle API unavailability?" | A) Fail request immediately / B) Queue for retry (requires bull) / C) Return cached/default value |
| `real-time` | Rule requires real-time updates and spec does not name a transport | "Rule [X] requires real-time updates. Which transport?" | A) WebSocket (socket.io) / B) Server-Sent Events / C) Polling |
| `search` | Rule requires search and spec does not specify search engine | "Rule [X] requires search. Which implementation?" | A) PostgreSQL ILIKE / B) PostgreSQL full-text (tsvector) / C) Elasticsearch |
| `caching` | Rule benefits from caching and spec does not specify strategy | "Rule [X] benefits from caching. Which layer?" | A) No caching / B) In-memory (local) / C) Redis (`@nestjs/cache-manager`) |
| `outbound-webhook` | Rule sends webhook to third-party and spec does not define retry policy | "Rule [X] sends webhook to third-party. Retry strategy?" | A) Fire-and-forget / B) Retry with exponential backoff (requires bull) / C) Delivery log + manual retry |

## B. Ambiguous Business Rules

Ask when a rule description is vague or incomplete. These are the triggers:

- Rule says "notify user" but does not specify which event exactly triggers the notification
- Rule has a status transition but does not specify the condition that allows the transition
- Rule involves a "fee" or "amount" with no formula or calculation method
- Rule says "system validates" but does not say what constitutes valid input
- Rule references a "role" that was not defined in the roles section of the spec
- Rule uses hedge words: "when appropriate", "if needed", "validate properly", "as necessary"

### Question Template

```
Q[N] [Rule ID -- short description]:
  The spec says: "[exact quote from the spec]"
  To implement this, I need to know: [specific question]
  Options: A) ... / B) ... / C) [describe in detail]
```

### Examples

```
Q3 [B5 -- notify on task completion]:
  The spec says: "The system shall notify the assignee when a task is completed."
  To implement this, I need to know: What triggers "completed"? Is it a manual status change, or automatic when all subtasks are done?
  Options: A) Manual status change by any user with update permission / B) Automatic when all subtasks reach "done" / C) Both (manual override + automatic trigger)

Q4 [B12 -- calculate service fee]:
  The spec says: "A service fee shall be applied to each transaction."
  To implement this, I need to know: What is the fee formula?
  Options: A) Fixed amount (specify value) / B) Percentage of transaction amount (specify %) / C) Tiered (provide tier table)
```

## C. Edge Cases

Always ask about these if not explicitly addressed in the spec.

### State Machine Edge Cases

- "What happens if a `[entity]` in state `[X]` is deleted? Options: A) Soft-delete only (set `deletedAt`) / B) Hard-delete allowed in any state / C) Hard-delete only from terminal states (`[list states]`)"
- "Can a cancelled/rejected `[entity]` be reactivated? Options: A) No, terminal state / B) Yes, returns to `[initial state]` / C) Yes, returns to `[specific state]`"

### Notification Edge Cases

- "Should notifications retry if sending fails? Options: A) No retry (fire-and-forget) / B) Retry up to 3 times with backoff / C) Retry up to N times (specify N and interval)"

### File Upload Edge Cases

- "What should happen if a file upload fails mid-stream? Options: A) Delete partial upload, return error / B) Keep partial upload, allow resume / C) Delete partial upload, queue for retry"

### External API Edge Cases

- "What is the timeout for `[provider]` API calls? Options: A) 5 seconds (default) / B) 10 seconds / C) Custom (specify)"

### Transaction Edge Cases

- "What is the rollback behavior if step `[N]` of the `[workflow]` fails? Options: A) Roll back all previous steps / B) Keep completed steps, mark workflow as partial / C) Keep completed steps, queue failed step for retry"

## D. Data / Seeder Questions

Always ask when the spec implies initial data (roles, lookup tables, reference data).

- "Should the seeder create default roles? (List from spec: `[admin, user, ...]`). Options: A) Yes, seed all listed roles / B) Yes, only admin / C) No seeder, create manually"
- "Should the seeder create sample entities for each module? (for dev/staging). Options: A) No sample data / B) 3 sample records per entity / C) Custom count (specify)"
- "Are there lookup tables or reference data that must be pre-populated? (e.g., status options, categories, countries). List them or answer 'none'."

## E. Q&A Format for Human

When asking questions, the planner MUST follow these rules:

1. **Group all questions by category** (Technology, Business Rules, Edge Cases, Data).
2. **Number them sequentially** Q1, Q2, Q3... across all categories.
3. **Ask ALL questions in ONE single message** (never one question at a time).
4. **Mark each question as REQUIRED or OPTIONAL**:
   - REQUIRED = blocks implementation; no safe default exists.
   - OPTIONAL = a sensible default exists; user can override or accept the default.

### Output Template

```
Before finalizing the plan, I need to clarify [N] points about the spec.

**Required answers** (blocking implementation):

Q1 [Background Jobs -- Rules B12, B14]:
  Rules B12 and B14 require background processing. Which scheduler?
  A) @nestjs/schedule (simple cron, no persistence)
  B) bull + @nestjs/bull (queue + Redis)
  C) bullmq + @nestjs/bullmq (modern queue + Redis)

Q2 [Email Provider -- Rules B5, B7]:
  Rules B5 and B7 require email notifications. Which provider?
  A) nodemailer + SMTP
  B) SendGrid
  C) AWS SES
  D) Resend

**Optional / defaults available** (answer to override):

Q3 [API Timeout -- Rule B7]:
  Default is 5s. Override? Specify in seconds or reply "default".

Q4 [Seeder]:
  Default creates admin + user roles + 3 sample records per entity. Override?

Reply with: Q1: B, Q2: A, Q3: 10s, Q4: default
```

### Rules for the Planner

- If there are zero gaps detected, skip the Q&A phase entirely and proceed to plan.json.
- Maximum 2 rounds of Q&A. If round 1 answers introduce new gaps (e.g., user picks "bull" which implies Redis), ask ONE follow-up batch in round 2. Do not ask a third round.
- If the user replies "default" or skips an OPTIONAL question, use the documented default.
- If the user skips a REQUIRED question, re-ask it once. If still unanswered, note it as an assumption in the plan and flag it with `"assumed": true` in the corresponding rule.

## F. Mapping Answers to plan.json / sbvr-rules.json

After receiving answers, update the plan artifacts as follows:

### Technology Choice Answers

Add a `technology` field to the matching rule in `sbvr-rules.json`:

```json
{
  "id": "B12",
  "type": "background-job",
  "description": "Process report generation asynchronously",
  "entity": "Report",
  "technology": "bullmq",
  "status": "pending",
  ...
}
```

If the technology requires infrastructure (e.g., Redis for bull/bullmq), add a top-level `infrastructure` array to `plan.json`:

```json
{
  "entities": [...],
  "infrastructure": [
    { "service": "redis", "requiredBy": ["B12", "B14"], "note": "Required for bullmq job queue" }
  ]
}
```

### Ambiguous Rule Answers

Update the rule's `description` in `sbvr-rules.json` with the clarified behavior:

```json
{
  "id": "B5",
  "type": "notification",
  "description": "Send email to assignee when task status changes to 'done' via manual update (not automatic). Use SendGrid provider.",
  ...
}
```

### Edge Case Answers

Add an `edgeCases` array to the relevant rule in `sbvr-rules.json`:

```json
{
  "id": "B3",
  "type": "state-machine",
  "description": "Task status transitions: pending -> in_progress -> done | cancelled",
  "edgeCases": [
    "Deletion: soft-delete only (set deletedAt), allowed in any state",
    "Reactivation: cancelled tasks can be moved back to pending by admin"
  ],
  ...
}
```

### Seeder Answers

Add a `seeder` section to `plan.json` root:

```json
{
  "entities": [...],
  "seeder": {
    "roles": ["admin", "user", "manager"],
    "sampleRecords": 3,
    "lookupTables": [
      { "entity": "Category", "records": ["Engineering", "Design", "Marketing"] }
    ]
  }
}
```

### Assumed Defaults

If an OPTIONAL question was not answered and a default was used, mark it in the rule:

```json
{
  "id": "B7",
  "type": "api-integration",
  "description": "Call payment gateway API with 5s timeout",
  "technology": "axios",
  "assumed": true,
  ...
}
```

This allows future reviewers to identify which decisions were explicit vs. defaulted.
