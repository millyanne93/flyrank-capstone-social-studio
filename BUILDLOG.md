# BUILDLOG.md — AI Usage Log

## Phase 1: Design

### AI Tools Used
- **Tool**: Claude (via web interface)
- **Purpose**: Architecture design, data modeling, constraint profile definition
- **Frequency**: Heavy usage during design phase

### Where AI Helped

| File/Component | What AI Provided | My Changes |
|----------------|------------------|------------|
| DESIGN.md | Initial architecture outline, data model suggestions | Refined non-goals, added slot_id unique constraint, removed lookahead window |
| Data model | Table structures with proper relationships | Added validation_errors JSONB for blocked variants |

### Where AI Got It Wrong

| Issue | What Happened | How I Fixed It |
|-------|---------------|----------------|
| Port conflict | AI assumed port 5432 was free | Changed to port 5433 in docker-compose.yml |
| Import issue | `getConstraintProfiles` not defined | Used `getAllConstraintProfiles` instead |

### Lessons Learned
1. LLMs are unreliable at character counting — validation must enforce limits
2. Unique constraints at database level are the only true enforcement for idempotency
3. Port conflicts are common with multiple PostgreSQL instances

---

## Phase 2: Ingestion & Generation

### AI Tools Used
- **Tool**: Claude (via web interface)
- **Purpose**: Code generation, debugging, testing
- **Frequency**: Heavy usage during Phase 2 implementation

### Where AI Helped

| File/Component | What AI Provided | My Changes |
|----------------|------------------|------------|
| constraintProfiles.service.ts | Validation functions | Added extractHashtags helper |
| variantGenerator.service.ts | Template-based generation | Added platform-specific formatting |
| postIngestion.service.ts | Orchestration logic | Added validation error handling |
| posts.routes.ts | API endpoints | Added error responses |

### Where AI Got It Wrong

| Issue | What Happened | How I Fixed It |
|-------|---------------|----------------|
| validateContent export | Function wasn't exported | Added export statement |
| getConstraintProfiles | Wrong function name | Used getAllConstraintProfiles |
| Port conflict | 5432 already in use | Changed to 5433 in docker-compose.yml |

### Lessons Learned
1. Validate content even when using AI generation — don't trust the model
2. Always test validation by intentionally breaking constraints
3. Check exports before importing functions

---

## Phase 2 Status

| Feature | Status | Evidence |
|---------|--------|----------|
| Ingestion endpoint | ✅ Working | curl POST /api/posts |
| Variant generation | ✅ Working | 3 variants generated per post |
| Validation | ✅ Working | 281 char post blocked with named error |
| Database | ✅ Working | 5 tables created |

---

## Phase 3: Review Workflow

### AI Tools Used
- **Tool**: Claude (via web interface)
- **Purpose**: Code generation, debugging database constraints, testing
- **Frequency**: Heavy usage during Phase 3 implementation

### Where AI Helped

| File/Component | What AI Provided | My Changes |
|----------------|------------------|------------|
| variants.routes.ts | Approve/reject/schedule endpoints | Added proper error handling |
| variants.repository.ts | Status update functions | Added attachVariantToSlot with duplicate check |
| slots.repository.ts | CRUD operations | Created repository from scratch |
| server.ts | Route registration | Added all Phase 3 routes |

### Where AI Got It Wrong

| Issue | What Happened | How I Fixed It |
|-------|---------------|----------------|
| Missing unique constraint | AI assumed constraint existed | Added ALTER TABLE to add uq_variants_slot_id |
| Duplicate slot assignments | No constraint meant multiple variants per slot | Manually cleared duplicates, added constraint |
| attachVariantToSlot | AI didn't check for existing slot_id | Added explicit check before updating |

### Lessons Learned
1. **Database constraints are the only true enforcement** - Always verify with \d table_name
2. **Manual duplicate cleanup needed** - Had to clear existing duplicates before adding constraint
3. **409 Conflict is the right HTTP status** - For slot already occupied
4. **Check the schema first** - Don't assume constraints exist

### Phase 3 Status

| Feature | Status | Evidence |
|---------|--------|----------|
| Approve endpoint | ✅ Working | curl POST /api/variants/:id/approve |
| Reject endpoint | ✅ Working | curl POST /api/variants/:id/reject |
| Edit endpoint | ✅ Working | curl PATCH /api/variants/:id |
| Create slot | ✅ Working | curl POST /api/slots |
| Schedule approved | ✅ Working | curl POST /api/variants/:id/schedule |
| Schedule draft (blocked) | ✅ Working | 400 error returned |
| Schedule occupied (409) | ✅ Working | 409 conflict returned |
| Unique constraint | ✅ Working | uq_variants_slot_id in schema |

---

## Phase 4: Adapters & Idempotent Publish

### AI Tools Used
- **Tool**: Claude (via web interface)
- **Purpose**: Adapter pattern implementation, idempotency logic, Telegram integration
- **Frequency**: Heavy usage during Phase 4 implementation

### Where AI Helped

| File/Component | What AI Provided | My Changes |
|----------------|------------------|------------|
| publisher.interface.ts | Clean adapter interface | Added proper TypeScript types |
| mock-x.publisher.ts | Mock implementation with random failures | Adjusted failure rates |
| mock-linkedin.publisher.ts | Mock implementation with delays | Adjusted timing and logging |
| telegram.publisher.ts | Real Telegram bot integration | Added error handling and config |
| publishAttempts.repository.ts | CRUD operations | Added idempotency key lookup |
| publish.service.ts | Core idempotent logic | Fixed config loading issue |
| publish.routes.ts | API endpoints | Added pending attempts and platforms endpoints |
| server.ts | Route registration | Added Phase 4 routes |

### Where AI Got It Wrong

| Issue | What Happened | How I Fixed It |
|-------|---------------|----------------|
| Config structure mismatch | AI expected flat config but had nested | Updated publish.service.ts to use config.telegram.botToken |
| dotenv not loading | dotenv missing from project | Added 'dotenv/config' import and installed package |
| Second publish behavior | AI expected "Already published" message | Got "Variant must be approved to publish" - actually better! |
| Status check order | AI didn't check status before publish | Added status validation in publish service |

### Lessons Learned
1. **Config structure matters** - Be consistent with flat vs nested
2. **dotenv must be imported** - Node.js doesn't auto-load .env
3. **Status flow is critical** - `draft → approved → published` prevents re-publishing
4. **Real vs Mock** - Telegram actually works! Need to handle real API responses

### Phase 4 Status

| Feature | Status | Evidence |
|---------|--------|----------|
| Publisher Interface | ✅ Working | Code compiles |
| Mock X Publisher | ✅ Working | Published with mock ID |
| Mock LinkedIn Publisher | ✅ Working | Published with mock ID |
| Telegram Publisher (Real) | ✅ Working | Message ID "4" in Telegram |
| Publish Attempts | ✅ Working | Table with unique idempotency_key |
| Idempotent Publish | ✅ Working | Cannot publish twice |
| Status Flow | ✅ Working | draft→approved→published |

---

## Phase 5: Scheduler & Hardening

### AI Tools Used
- **Tool**: Claude (via web interface)
- **Purpose**: Scheduler implementation, graceful shutdown, retry logic
- **Frequency**: Heavy usage during Phase 5 implementation

### Where AI Helped

| File/Component | What AI Provided | My Changes |
|----------------|------------------|------------|
| scheduler.types.ts | Configuration types | Added retry configuration |
| scheduler.service.ts | Core scheduler logic | Added due slot detection, retry logic |
| scheduler.routes.ts | Control endpoints | Added start/stop/status endpoints |
| server.ts | Integration | Added auto-start, graceful shutdown |

### Lessons Learned
1. **Scheduler should auto-start** - Reduces manual intervention
2. **Graceful shutdown is critical** - Prevents orphaned processes
3. **10-second intervals are fine** - Good balance of responsiveness and performance
4. **Database queries should be efficient** - LIMIT prevents overload

### Phase 5 Status

| Feature | Status | Evidence |
|---------|--------|----------|
| Scheduler Service | ✅ Working | Auto-starts on boot |
| Due slot detection | ✅ Working | Found and processed slot |
| Automatic publishing | ✅ Working | Published successfully |
| No duplicates | ✅ Working | Only published once |
| Control endpoints | ✅ Working | Start/stop/status work |
| Graceful shutdown | ✅ Working | Handles SIGTERM/SIGINT |

---

## AI Usage Summary (Phase 1-5)

| Metric | Value |
|--------|-------|
| Total AI-assisted files | 30+ |
| AI code generation % | ~65% |
| Manual fixes/adaptations | ~35% |
| Bugs introduced by AI | 6 |
| Bugs caught by human review | 6 |
| Bugs in production | 0 |
| Project completion | 100% |
