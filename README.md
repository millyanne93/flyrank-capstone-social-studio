# Social Media Studio — FlyRank Capstone

A multi-platform social media campaign management system that transforms blog posts into platform-optimized variants with human-in-the-loop approval and idempotent scheduling.

## 🎯 Project Overview

Turn one blog post into a scheduled, multiplatform social campaign. The system generates one variant per target platform, each enforced against that platform's constraint profile (length, tone, hashtags). A human approves each variant before it can be scheduled. A durable scheduler publishes each approved variant exactly once — even under retry, timeout, or worker crash.

## 🚀 Features

### Phase 1: Design ✅
- Architecture design with adapter pattern
- Data model with 5 tables
- Constraint profiles for X, LinkedIn, Telegram
- Idempotency mechanism design

### Phase 2: Ingestion & Generation ✅
- Ingest posts via URL or Markdown
- Generate 3 variants per post (X, LinkedIn, Telegram)
- Validate against platform constraints
- Block rule-breaking variants with named errors

### Phase 3: Review Workflow ✅
- Approve/reject variants (draft → approved/rejected)
- Edit draft variants
- Create time slots
- Schedule approved variants
- Prevent duplicate slot assignments (409 Conflict)

### Phase 4: Adapters & Idempotent Publish ⏳
- Telegram publisher (real)
- Mock X publisher
- Mock LinkedIn publisher
- Idempotent publish mechanism
- Exactly-once guarantee
- Publish attempts tracking
### Phase 5: Scheduling & Hardening ⏳
- Durable scheduler worker
- Claim-then-publish pattern
- Retry logic with exponential backoff
- Monitoring & logging

## 🛠️ Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (via Docker)
- **AI**: Template-based generation (Gemini-ready)
- **Validation**: Custom constraint profiles
- **Testing**: curl + bash scripts

## 📦 Quick Start

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/flyrank-capstone-social-studio.git
cd flyrank-capstone-social-studio

# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d

# Run migrations
npm run migrate

# Seed constraint profiles
npm run seed

# Start the server
npm run dev
Environment Variables
Create a .env file:

env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/social_studio
TELEGRAM_BOT_TOKEN=your_bot_token_here
## API Endpoints
Posts
Method	Endpoint	Description
POST	/api/posts	Ingest a post (URL or Markdown)
GET	/api/posts	List all posts
GET	/api/posts/:id	Get post with variants
Variants
Method	Endpoint	Description
POST	/api/variants/:id/approve	Approve a draft variant
POST	/api/variants/:id/reject	Reject a draft variant
PATCH	/api/variants/:id	Edit a draft variant
POST	/api/variants/:id/schedule	Schedule an approved variant
Slots
Method	Endpoint	Description
POST	/api/slots	Create a time slot

### Publishing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/variants/:id/publish` | Publish a variant (idempotent) |
| GET | `/api/variants/:id/attempts` | Get publish attempts for a variant |
| GET | `/api/publish/pending` | Get pending publish attempts |
| GET | `/api/publish/platforms` | Get configured platforms |
🧪 Testing
bash
# Health check
curl http://localhost:3000/health

# Create a post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"source_type":"markdown","title":"Test","body":"Content"}'

# Approve a variant
curl -X POST http://localhost:3000/api/variants/:id/approve

# Create a slot
curl -X POST http://localhost:3000/api/slots \
  -H "Content-Type: application/json" \
  -d '{"scheduled_for":"2026-09-06T10:00:00Z"}'

# Schedule a variant
curl -X POST http://localhost:3000/api/variants/:id/schedule \
  -H "Content-Type: application/json" \
  -d '{"slot_id":"slot-id-here"}'
## Database Schema
5 core tables:

posts — Source content

constraint_profiles — Platform rules

variants — Generated content with status

slots — Time slots for publishing

publish_attempts — Idempotent publish records

## Project Structure

src/
├── db/
│   ├── client.ts              # Database connection
│   └── migrations/            # SQL migrations
├── repositories/              # Data access layer
│   ├── posts.repository.ts
│   ├── variants.repository.ts
│   ├── slots.repository.ts
│   └── constraintProfiles.repository.ts
├── services/
│   ├── ingestion/            # Post ingestion
│   ├── generation/           # Variant generation
│   ├── validation/           # Constraint validation
│   └── publishing/           # Adapters (Phase 4)
├── routes/                   # API routes
│   ├── posts.routes.ts
│   └── variants.routes.ts
├── validation/               # Zod schemas
│   └── posts.schema.ts
├── config.ts                 # Configuration
└── server.ts                 # Entry point
```
## Key Design Decisions
Validation is the trust boundary — Never trust LLM output

Database constraints enforce uniqueness — Not application logic alone

Adapter pattern for platforms — Easy to add new platforms

Idempotency via unique constraints — No duplicate publishes

Human-in-the-loop approval — All variants must be approved

## Phase Status
| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Design | ✅ Complete | 100% |
| Phase 2: Ingestion & Generation | ✅ Complete | 100% |
| Phase 3: Review Workflow | ✅ Complete | 100% |
| Phase 4: Adapters & Idempotent Publish | ✅ Complete | 100% |
| Phase 5: Scheduling & Hardening | ⏳ Pending | 0% |
## Documentation
DESIGN.md — Architecture and design decisions

EVIDENCE.md — Definition of Done proof

BUILDLOG.md — AI usage and lessons learned

## Contributing
This is a capstone project for the FlyRank program. Follow the design doc and evidence requirements.

## License
MIT

Built with as part of the FlyRank Capstone Program

text
