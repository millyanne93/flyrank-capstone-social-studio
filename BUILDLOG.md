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

## AI Usage Summary (Phase 1-3)

| Metric | Value |
|--------|-------|
| Total AI-assisted files | 20+ |
| AI code generation % | ~65% |
| Manual fixes/adaptations | ~35% |
| Bugs introduced by AI | 4 |
| Bugs caught by human review | 4 |
| Bugs in production | 0 |
