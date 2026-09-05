# Design Doc — Social Media Studio

## 1. Problem

Turn one blog post into a scheduled, multiplatform social campaign. The system
generates one variant per target platform, each enforced against that platform's
constraint profile (length, tone, hashtags). A human approves each variant before it
can be scheduled. A durable scheduler publishes each approved variant exactly once —
even under a retry, a timeout, or a worker crash mid-batch.

**The core discipline:** the publishing path is the trust boundary, not the content
generation path. Generating a bad variant is a nuisance; publishing an unapproved
variant, or publishing the same variant twice, is the failure this capstone actually
grades. Idempotency and the adapter seam are the load-bearing pieces — content
generation is comfortable territory by comparison.

---

## 2. Non-goal

**No image or media attachments — text-only posts.** Every variant is plain text
(plus hashtags). No image generation, no media upload handling, no platform-specific
media constraints (aspect ratios, file size limits). This keeps the constraint
profile validation entirely about text (length, tone, hashtag count) and keeps the
adapter interface simple (one `content: string` payload, not a multi-part media
upload per platform) — protecting build time for the idempotency and scheduling work
that's actually graded.

---

## 2a. Variant generation (AI prompt)

If using Gemini for generation, the prompt is:

```
You are a social media content creator. Given a blog post, create a version
for {platform} with the following rules:
- Max length: {max_length} characters
- Tone: {tone}
- Hashtags: {min_hashtags}-{max_hashtags}

Blog post:
{title}
{body}

Return ONLY the post text, no commentary, no markdown, no emojis.
```

The generated text is then validated against the same constraint profile before
being stored as a `draft` variant.

**The model is told the limit but not trusted to obey it.** LLMs are unreliable at
precise character counting, so validation runs identically whether the text came
from AI or a hand-written template. An AI-generated variant failing validation on
length is an expected, normal occurrence — not a bug, and not a reason to special-
case AI output through a looser check. This is the same "zero special trust" stance
as Section 11's note on AI-generated content generally, just made explicit here
since it's the one place a reader might otherwise assume telling the model the
number is sufficient enforcement on its own.

---

## 3. Platforms and constraint profiles

Two platforms for Phase 2 (X-style and LinkedIn-style), matching the two mock
adapters required in Phase 4. Telegram (the real adapter) gets its own profile once
the pattern is proven — its constraints are looser, so it's a good third case to
confirm the profile system generalizes.

| Platform | Max length | Tone | Hashtags | Notes |
|---|---|---|---|---|
| X (mock) | 280 characters | Punchy, direct | 1–2 | No links counted separately for v1 (non-goal: URL shortening) |
| LinkedIn (mock) | 3,000 characters | Professional, reflective | 3–5 | Expects a closing question or CTA line |
| Telegram (real) | 4,096 characters | Neutral/informational | 0–3 | No hard hashtag requirement |

Each profile is a plain data object, not hardcoded logic scattered through the
generator — see Section 6 for why this matters for the adapter seam.

```json
{
  "platform": "x",
  "max_length": 280,
  "tone": "punchy, direct",
  "min_hashtags": 1,
  "max_hashtags": 2
}
```

---

## 4. Data model

### `posts`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `source_type` | enum: `url`, `markdown` | how the post was ingested |
| `source_url` | text, nullable | populated if `source_type = url` |
| `title` | text | |
| `body` | text | the stored Markdown/plain text — the single source of truth |
| `created_at` | timestamptz | |

> **Why `body` is the only thing generation ever reads:** the brief is explicit that
> "all generation reads from the stored post only." No variant generation call should
> ever re-fetch a URL or accept fresh text — it reads `posts.body` and nothing else.
> This makes every variant traceable back to one immutable source.

### `constraint_profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `platform` | text, unique | `x`, `linkedin`, `telegram` |
| `max_length` | int | |
| `tone` | text | descriptive, used in the generation prompt if AI is used |
| `min_hashtags` | int | |
| `max_hashtags` | int | |

Seeded once at setup, per Section 3's table — not hardcoded in application code, so
adding a platform later means inserting a row, not shipping a code change.

### `variants`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `post_id` | uuid, FK → posts | |
| `platform` | text, FK → constraint_profiles.platform | |
| `content` | text | the generated/edited variant text |
| `status` | enum: `draft`, `approved`, `rejected`, `published` | see Section 7 |
| `slot_id` | uuid, FK → slots, nullable, **unique** | set by `POST /variants/:id/schedule` — see note below |
| `validation_errors` | jsonb, nullable | populated if generation produced something that failed its profile — see note below |
| `created_at` / `updated_at` | timestamptz | |

> **Why `slot_id` lives here, and why it's unique:** scheduling a variant means
> recording *which slot it's attached to* — without this column, nothing in the
> schema captures that assignment, and the scheduler has no way to query "which
> approved variants are due." The `UNIQUE` constraint is what actually enforces "a
> slot can hold at most one variant" — without it, that rule is just a sentence in a
> doc, not something the database defends. Attempting to schedule a second variant
> into an already-claimed slot should fail the same way a duplicate publish attempt
> fails: at the database, on a constraint, not on a check that's easy to skip.

> **Why a rejected-at-generation variant still gets a row:** a variant that breaks
> its constraint profile "never reaches review" per the brief, but that doesn't mean
> it's silently discarded — logging it with `validation_errors` populated is what
> lets `EVIDENCE.md` prove the validation actually caught something, rather than
> asserting it in prose with nothing to point to.

### `slots`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `scheduled_for` | timestamptz | when this slot should publish |
| `created_at` | timestamptz | |

A slot is just a point in time; `variants.slot_id` is what links a slot to the one
variant scheduled into it.

### `publish_attempts` — the idempotency ledger
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `variant_id` | uuid, FK → variants | |
| `slot_id` | uuid, FK → slots | |
| `idempotency_key` | text, unique | deterministic, derived from `(variant_id, slot_id)` — see Section 8 |
| `status` | enum: `pending`, `succeeded`, `failed` | |
| `platform_message_ref` | text, nullable | the real platform's message id/link, once published |
| `attempted_at` | timestamptz | |

> **This table is the actual mechanism behind Probe 5.** The `idempotency_key`
> column has a unique constraint at the database level — not just an
> application-level check. A retry that tries to insert a second `publish_attempts`
> row for the same `(variant_id, slot_id)` pair fails the `INSERT` outright, at the
> database, before any application logic can even consider calling the platform API
> a second time. This is the difference between "the code tries not to double-post"
> and "the database will not physically allow a double-post to be recorded." See
> Section 8 for the exact key derivation and the full claim/publish sequence.

### Indexes worth calling out
- `publish_attempts(idempotency_key)` — unique, enforces the core publish guarantee
- `variants(slot_id)` — unique, enforces "one variant per slot"
- `variants(status)` — the scheduler and review queue both filter on this
- `variants(post_id)` — lookup all variants for a given post

---

## 5. API surface

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/posts` | Ingest a post (URL or Markdown) |
| `POST` | `/api/posts/:id/variants` | Generate variants for all (or specified) platforms |
| `GET` | `/api/posts/:id/variants` | List a post's variants and their statuses |
| `PATCH` | `/api/variants/:id` | Edit variant content (while still `draft`) |
| `POST` | `/api/variants/:id/approve` | `draft` to `approved` |
| `POST` | `/api/variants/:id/reject` | `draft` to `rejected` |
| `POST` | `/api/slots` | Create a time slot |
| `POST` | `/api/variants/:id/schedule` | Attach an approved variant to a slot (writes `variants.slot_id`); `4xx` if not `approved`, `4xx` if the slot is already taken |
| `GET` | `/api/publish-history` | List all publish attempts and their outcomes |

### 5a. Slot creation

A slot is created via `POST /api/slots`:
```json
{ "scheduled_for": "2026-09-10T14:00:00Z" }
```

`POST /api/variants/:id/schedule` then links an approved variant to an existing slot
by writing `variants.slot_id`. Because that column is unique, attaching a second
variant to an already-occupied slot fails at the database and should be surfaced as
a `409 Conflict`, not a generic `400`.

---

## 6. The adapter seam

```
interface SocialPublisher {
  publish(content: string, idempotencyKey: string): Promise<PublishResult>
}

type PublishResult = {
  success: boolean
  platformMessageRef?: string
  error?: string
}
```

Implementations:
- `TelegramPublisher` — calls the real Telegram Bot API `sendMessage`
- `MockXPublisher` — writes a row to a local "would-have-posted" table, returns a fake ref
- `MockLinkedInPublisher` — same pattern as MockX

**The one rule that makes this seam real, not decorative:** nothing outside
`services/publishers/` may import a specific publisher class. The scheduler resolves
`platform to publisher instance` through one small factory/lookup keyed off
`constraint_profiles.platform` (or a config value), so swapping `telegram` for
`mock_x` in configuration touches zero business logic — this is what Probe 6
actually checks, and it's trivially easy to accidentally violate by importing
`TelegramPublisher` directly somewhere convenient.

### 6a. Telegram adapter setup

The Telegram adapter requires:
- A bot token from @BotFather, stored in `.env` as `TELEGRAM_BOT_TOKEN`
- A chat ID for your own channel or group where the bot is a member
- For private channels, the bot must be added as an admin

The chat ID can be hardcoded in `.env` for v1, since this is a single-user demo.

---

## 7. Review workflow

```
draft --(approve)--> approved --(scheduler publishes)--> published
  |
  +--(reject)--> rejected
```

- Only `draft` variants can be edited (`PATCH`)
- Only `approved` variants can be scheduled — `POST /variants/:id/schedule` on a
  `draft` or `rejected` variant returns `400` with an error naming the actual
  problem ("variant is not approved"), not a generic failure
- `published` is set only after a `publish_attempts` row reaches `succeeded` — never
  set optimistically before the publish call returns

---

## 8. Idempotent scheduling — the core mechanism

**Idempotency key derivation:** deterministic, not random —
`sha256(variant_id + ":" + slot_id)`. Deterministic matters: if the same
`(variant_id, slot_id)` pair is ever processed twice (a retry, a re-queued job after
a crash), it produces the same key both times, which is what lets the database's
unique constraint catch the duplicate. A randomly generated key would defeat the
whole mechanism — it would be different every attempt regardless of whether the
underlying work was actually the same.

**The claim-then-publish sequence** (this ordering is the whole mechanism):
```
1. Worker picks up a due slot + its attached approved variant (via variants.slot_id)
2. Worker computes idempotency_key = sha256(variant_id + slot_id)
3. Worker attempts: INSERT INTO publish_attempts (variant_id, slot_id,
   idempotency_key, status) VALUES (..., 'pending')
     - If this INSERT fails on the unique constraint, another attempt already
       claimed this work (in progress or already succeeded). Stop here. This is
       what makes a crash-and-restart safe: the restarted worker tries the same
       INSERT, it fails, and it moves on rather than re-publishing.
4. INSERT succeeded, this worker owns the attempt. Call the resolved
   SocialPublisher.publish(content, idempotency_key)
5. On success: UPDATE the row to status = 'succeeded', save platform_message_ref,
   set variants.status = 'published'
6. On failure: UPDATE the row to status = 'failed' — a future scheduler pass may
   retry, which starts back at step 2 with the SAME idempotency_key, so a failed
   attempt can be retried, but a succeeded one structurally cannot be repeated
```

**Why step 3 (claim before publish) matters more than step 4 (the actual API call):**
the real platform API call is the part most people assume is where idempotency
lives, but it isn't — Telegram's `sendMessage` has no idempotency guarantee of its
own. The guarantee has to come from your own database refusing to let the same work
be claimed twice, before the external call ever happens.

---

## 9. Durable scheduling

The worker's job loop, each tick:
1. Query `variants` joined to `slots` on `variants.slot_id`, where
   `slots.scheduled_for <= now()`, `variants.status = 'approved'`, and no
   `succeeded` row yet exists in `publish_attempts` for that `(variant_id, slot_id)`
2. Run the claim-then-publish sequence (Section 8) for each result

**No lookahead window.** An earlier draft of this design queried
`scheduled_for <= now() + 5 minutes`, intending it as a buffer — but for a plain
poll loop that immediately runs claim-then-publish on every query result, that
condition causes a slot to publish **up to 5 minutes before its scheduled time**,
which directly contradicts Probe 4 ("schedule it two minutes out... the scheduler
publishes it" — implying at that time, not early). The query condition is exactly
`scheduled_for <= now()`, checked every tick. A lookahead window is a legitimate
concept for a system that loads jobs into a delayed-execution queue (e.g. BullMQ's
own delayed-job scheduling, which holds the job and fires it at the exact target
time) — but that is a different, more complex design than the plain poll loop this
v1 uses, and is out of scope unless adopted deliberately as a stretch goal.

**Why this is crash-safe without any special recovery code:** because the "did this
already happen" check is just a normal query against `publish_attempts`, a worker
that crashes mid-batch and restarts simply runs the same query again — anything
already `succeeded` is filtered out naturally, anything `pending` from a dead worker
gets re-claimed (see Section 11's open question on stale `pending` rows), and
anything not yet attempted gets picked up as if nothing happened. There's no
separate "resume from checkpoint" logic to write or get wrong.

### 9a. Worker loop

The worker runs a plain interval loop (`setInterval`, or a BullMQ repeatable job).
Each tick:
1. Query for due (variant, slot) pairs per Section 9's exact condition
2. For each, attempt the claim-then-publish sequence
3. Sleep for a fixed interval (e.g. 30 seconds) before the next tick

Idempotency ensures that even if two worker processes run overlapping ticks, only
one claim succeeds per `(variant, slot)` pair — the second worker's `INSERT` simply
fails on the unique constraint and it moves on, no coordination between workers
required.

---

## 10. What success looks like

| Test | Expected result |
|---|---|
| Ingest a post, generate variants for X and LinkedIn | Two distinct variants, each passing its own constraint profile |
| Generate a variant that would exceed X's 280-char limit | Blocked before reaching draft, error names the specific rule broken |
| Schedule a draft (unapproved) variant | 400, error message states it isn't approved |
| Schedule a second variant into an already-occupied slot | 409, error names the conflict |
| Approve and schedule a variant 2 minutes out | Real Telegram message appears in the target channel at that time, not before; publish history links to it |
| Call the schedule/publish path twice for the same variant and slot | Exactly one succeeded row in publish_attempts, one message sent |
| Kill the worker process mid-batch, restart it | History shows no duplicates; anything not yet done gets picked up |
| Swap telegram to mock_x in config for a campaign | Same variant publishes through the mock adapter; zero code changes outside adapter config |

---

## 11. Open questions / decisions made

| Question | Decision |
|---|---|
| What if a worker dies right after claiming (INSERT succeeds) but before calling .publish()? | The publish_attempts row is stuck at pending unless handled. Decision: the scheduler's query treats a pending row older than a timeout threshold (e.g. 2 minutes) as abandoned and eligible for retry — retrying still goes through the same idempotency key, so this cannot create a duplicate on the platform side, only a delayed retry of the same claimed work. |
| What if .publish() succeeds on the platform but the worker crashes before writing status = succeeded? | This is the one genuine risk in the design — the platform received the message but our own record still says pending/failed, and a naive retry would double-post. Mitigation for v1: log platform_message_ref as early as possible, immediately after the API call returns. Full exactly-once-across-the-network guarantees are a stretch goal, not core scope — noted as a known limitation in the README rather than silently ignored. |
| Why hash the idempotency key instead of a plain concatenated string? | Either works functionally. Hashing keeps the key a fixed, opaque length and matches common idempotency-key conventions (e.g. Stripe's). Not load-bearing — a plain string would also satisfy the requirement. |
| Where does AI (Gemini) fit into generation? | Called once per platform per post, prompted with the stored body plus that platform's tone/max_length/hashtag range from constraint_profiles (see Section 2a). The AI's output still passes through the same validation code as a hand-written template would — the brief is explicit that enforcement is graded, not generation quality, so AI output gets zero special trust. |
| Why did the worker loop's lookahead window get removed? | It caused early publishing, contradicting Probe 4. See Section 9 for the full explanation. |

---

## 12. Layering

```
routes/          — HTTP only
services/
  generation/     — variant generation (AI call or template), no SQL
  validation/     — constraint profile enforcement, pure functions, easy to unit test
  publishers/     — the SocialPublisher interface and all adapter implementations
  scheduler/      — the claim-then-publish job loop
repositories/     — all SQL lives here
jobs/             — the worker entrypoint that runs the scheduler loop on an interval
```

`validation/` deliberately has no dependencies on the database or HTTP — it should
be testable with plain function calls and fixture data, since Probe 2 (a rule-
breaking variant gets blocked with a named error) is exactly the kind of thing that
deserves a fast, isolated unit test rather than a full request/response cycle.

---

## 13. Flow diagram

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│   Ingest   │───▶│  Generate  │───▶│ Validation │───▶│   Review   │
│ POST /api/ │    │  variants  │    │ (each vs.  │    │  approve / │
│   posts    │    │ (per       │    │ its own    │    │  reject    │
└────────────┘    │  platform) │    │ profile)   │    └─────┬──────┘
                   └────────────┘    └─────┬──────┘          │
                                            │ fails           │ approved
                                            ▼                 ▼
                                     ┌────────────┐    ┌────────────┐
                                     │  Blocked,  │    │  Schedule  │
                                     │  error     │    │ (attach to │
                                     │  names the │    │   a slot)  │
                                     │  rule      │    └─────┬──────┘
                                     └────────────┘          │
                                                              ▼
                                                       ┌────────────┐
                                                       │ Scheduler  │
                                                       │  worker    │
                                                       │ (claim +   │
                                                       │  publish)  │
                                                       └─────┬──────┘
                                                              │
                                                              ▼
                                                       ┌────────────┐
                                                       │  Adapter   │
                                                       │  Telegram  │
                                                       │  MockX     │
                                                       │  MockLI    │
                                                       └─────┬──────┘
                                                              │
                                                              ▼
                                                       ┌────────────┐
                                                       │  Publish   │
                                                       │  history   │
                                                       └────────────┘
```

---

## 14. Summary of key files

| File | Purpose |
|---|---|
| `src/services/validation/constraintProfiles.ts` | Pure functions that validate content against platform rules |
| `src/services/publishers/SocialPublisher.ts` | Interface definition |
| `src/services/publishers/TelegramPublisher.ts` | Real adapter for Telegram |
| `src/services/publishers/MockXPublisher.ts` | Mock adapter for X |
| `src/services/publishers/MockLinkedInPublisher.ts` | Mock adapter for LinkedIn |
| `src/services/scheduler/worker.ts` | The claim-then-publish job loop |
| `src/repositories/publishAttempts.repository.ts` | Performs the claim INSERT that the database's unique constraint enforces |
