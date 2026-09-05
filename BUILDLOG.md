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

## AI Usage Summary (Phase 1-2)

| Metric | Value |
|--------|-------|
| Total AI-assisted files | 15+ |
| AI code generation % | ~65% |
| Manual fixes/adaptations | ~35% |
| Bugs introduced by AI | 3 |
| Bugs caught by human review | 3 |
| Bugs in production | 0 |
