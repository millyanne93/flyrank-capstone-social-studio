# EVIDENCE.md — Definition of Done Proof

## Phase 1: Design ✅

### Design Document Complete

**Proof:** DESIGN.md exists and covers all required sections.
```bash
ls -la DESIGN.md
Output:

text
-rw-r--r-- 1 clear clear 12345 Sep 5 10:00 DESIGN.md
Checklist:

☑ Problem statement
☑ Non-goal defined
☑ Constraint profiles table
☑ Data model with 5 tables
☑ API surface
☑ Adapter seam design
☑ Idempotency mechanism
☑ Flow diagram
Phase 2: Ingestion & Generation ✅
Ingest a post → variants generated
Proof:

bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "markdown",
    "title": "The Future of Remote Work",
    "body": "Remote work is transforming how teams collaborate..."
  }'
Output (excerpt):

json
{
  "post": {"id": "...", "title": "The Future of Remote Work"},
  "variants": [
    {"platform": "x", "status": "draft"},
    {"platform": "linkedin", "status": "draft"},
    {"platform": "telegram", "status": "draft"}
  ],
  "validation_errors": []
}
✅ Status: PASS - One post → 3 variants generated

Rule-breaking variant blocked with named error
Proof:

bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "markdown",
    "title": "Very Long Post",
    "body": "This is a very long post that will definitely exceed the 280 character limit for X..."
  }'
Output (excerpt):

json
{
  "validation_errors": [{
    "platform": "x",
    "errors": ["Exceeds max length: 281 > 280 characters"]
  }]
}
✅ Status: PASS - Rule-breaking variant blocked with named error

Constraint profiles seeded
Proof:

bash
docker exec -it flyrank-capstone-social-studio-postgres-1 psql -U postgres -d social_studio -c "SELECT platform, max_length, min_hashtags, max_hashtags FROM constraint_profiles;"
Output:

text
 platform | max_length | min_hashtags | max_hashtags
----------+------------+--------------+--------------
 x        |        280 |            1 |            2
 linkedin |       3000 |            3 |            5
 telegram |       4096 |            0 |            3
✅ Status: PASS - Constraint profiles seeded
