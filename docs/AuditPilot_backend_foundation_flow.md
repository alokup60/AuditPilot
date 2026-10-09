# AuditPilot — Backend Foundation & MongoDB Flow

This document is the quick-reference guide for understanding where files belong and how the backend foundation flows through AuditPilot.

---

## 1. Overall Runtime Architecture

```text
                         USER / BROWSER
                               |
                               v
                    +----------------------+
                    | React + TypeScript   |
                    | apps/web             |
                    +----------+-----------+
                               |
                         HTTPS / REST
                               |
                               v
                    +----------------------+
                    | Node.js + Express    |
                    | apps/api             |
                    +----------+-----------+
                               |
               +---------------+----------------+
               |                                |
               v                                v
       +---------------+                +---------------+
       | MongoDB Atlas |                | BullMQ        |
       | Mongoose      |                | Queue         |
       +---------------+                +-------+-------+
                                               |
                                               v
                                    +----------------------+
                                    | Background Workers   |
                                    | apps/workers         |
                                    +----------+-----------+
                                               |
                       +-----------------------+----------------------+
                       |                       |                      |
                       v                       v                      v
                    Crawling               Analysis                  AI
                  / Evidence              / Findings            / Strategy
                       |                       |                      |
                       +-----------------------+----------------------+
                                               |
                                               v
                                          Proposal
```

---

## 2. Monorepo Architecture

```text
AuditPilot/
|
+-- apps/
|   +-- web/                  # React frontend
|   +-- api/                  # Express backend
|   +-- workers/              # Background processing
|
+-- packages/
|   +-- config/               # Environment configuration
|   +-- contracts/            # Shared request/response/job contracts
|   +-- domain/               # Business/domain concepts
|   +-- validation/           # Zod schemas
|   +-- errors/               # Shared application errors
|   +-- security/             # Security utilities
|   +-- observability/        # Logging/tracing/metrics
|   +-- utils/                # Generic utilities
|
+-- docs/
+-- tests/
+-- scripts/
+-- infrastructure/
|
+-- package.json
+-- pnpm-workspace.yaml
+-- tsconfig.base.json
+-- .env
+-- .env.example
```

### Core rule

```text
apps
  |
  +----> packages
```

Applications consume shared packages. Shared packages should not depend on application-specific code.

---

# 3. Responsibility of Each App

## `apps/web`

Frontend responsibility:

```text
User
  ↓
React UI
  ↓
API calls
  ↓
Display results
```

Eventually it will contain feature modules such as:

```text
auth
audits
findings
recommendations
strategy
proposals
```

---

## `apps/api`

Main HTTP backend.

```text
HTTP Request
  ↓
Middleware
  ↓
Route
  ↓
Controller
  ↓
Application / Use Case
  ↓
Repository / Services
```

The API is responsible for:

```text
Authentication
Authorization
Validation
Audit creation
Read APIs
Queue creation
Progress APIs
Proposal APIs
Export / Share APIs
```

The API should not perform long-running crawl/AI work.

---

## `apps/workers`

Background processing.

```text
BullMQ
  ↓
Worker
  ↓
Processor
```

Responsibilities:

```text
Crawling
Evidence collection
Screenshots
Deterministic analysis
AI processing
Recommendations
Redesign strategy
Proposal generation
```

---

# 4. Shared Packages

## `packages/config`

Central environment configuration.

```text
.env
  ↓
process.env
  ↓
@auditpilot/config
  ↓
Zod validation
  ↓
Typed configuration
  ↓
API / Workers
```

Only the config package should directly access `process.env`.

Avoid:

```ts
process.env.MONGODB_URI;
process.env.REDIS_URL;
process.env.JWT_SECRET;
```

throughout application code.

Prefer:

```ts
config.mongodb.uri;
config.redis.url;
config.auth.jwtSecret;
```

---

## `packages/contracts`

Shared data shapes.

Examples:

```text
CreateAuditRequest
AuditResponse
FindingResponse
JobPayload
Recommendation
Proposal
```

This creates one shared language between:

```text
React
  ↕
API
  ↕
Workers
  ↕
AI pipeline
```

---

## `packages/domain`

Business concepts and rules.

Examples:

```text
Audit
Finding
Recommendation
RedesignStrategy
Proposal
Job
```

Domain code should not know whether the database is MongoDB or another database.

---

## `packages/validation`

Zod schemas for runtime validation.

Examples:

```text
CreateAuditSchema
FindingSchema
RecommendationSchema
ProposalSchema
JobPayloadSchema
```

Flow:

```text
Incoming data
  ↓
Zod
  ↓
Valid / Invalid
```

---

## `packages/errors`

Shared application error model.

Examples:

```text
ValidationError
UnauthorizedError
ForbiddenError
NotFoundError
ConflictError
RateLimitError
CrawlError
AIError
ExternalServiceError
```

The API maps these errors to consistent HTTP responses.

---

## `packages/security`

Reusable security mechanisms.

Examples:

```text
JWT helpers
Password hashing
Authorization helpers
Ownership checks
Security constants
```

Authentication routes still belong in the API application.

---

## `packages/observability`

Cross-cutting telemetry.

Examples:

```text
Logging
Metrics
Tracing
Correlation IDs
```

Useful identifiers:

```text
requestId
userId
auditId
jobId
```

---

## `packages/utils`

Only genuinely generic helpers belong here.

Examples:

```text
date helpers
ID helpers
pagination helpers
string helpers
```

Do not turn `utils` into a dumping ground.

---

# 5. Configuration Flow

The environment flow should be:

```text
.env
 |
 v
process.env
 |
 v
@auditpilot/config
 |
 +----> Validate
 +----> Convert types
 +----> Apply safe defaults
 |
 v
Typed config
 |
 +----------+-----------+
 |                      |
 v                      v
apps/api             apps/workers
```

Example:

```text
PORT="4000"
```

is converted to:

```text
config.server.port -> 4000
```

The rest of the application should not need to know that environment variables started as strings.

---

# 6. Environment Files

## `.env.example`

Safe to commit:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=
REDIS_URL=
```

## `.env`

Contains local secrets:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=<real value>
REDIS_URL=<real value>
```

Never commit:

```text
.env
.env.local
.env.production
```

Commit:

```text
.env.example
```

---

# 7. MongoDB Connection Flow

MongoDB is the application database.

```text
apps/api
   |
   v
@auditpilot/config
   |
   v
config.mongodb.uri
   |
   v
apps/api/src/infrastructure/mongodb.ts
   |
   v
Mongoose
   |
   v
MongoDB Atlas
```

The connection module is infrastructure code.

It should not contain:

```text
Audit business rules
Finding logic
Proposal logic
HTTP routes
```

---

# 8. MongoDB Module Responsibility

`apps/api/src/infrastructure/mongodb.ts`

Should conceptually do:

```text
1. Read MongoDB URI from config
2. Validate that the URI exists
3. Call Mongoose connection
4. Handle initial connection errors
5. Expose connection state if needed
6. Fail startup on initial connection failure
```

It should not perform application queries.

---

# 9. API Startup Flow

Preferred startup lifecycle:

```text
Start Node process
       |
       v
Load configuration
       |
       v
Validate environment
       |
       v
Connect MongoDB
       |
       +---- failure ----> log error + stop
       |
       v
Create Express app
       |
       v
Register middleware
       |
       v
Register routes
       |
       v
Start HTTP server
       |
       v
API ready
```

This is fail-fast startup behavior.

We do not want:

```text
API listening
   ↓
MongoDB actually unavailable
```

---

# 10. `app.ts` vs `server.ts`

Keep the responsibilities separate.

## `app.ts`

Owns the Express application:

```text
Create Express app
  ↓
Middleware
  ↓
Routes
  ↓
Error handler
  ↓
Export app
```

It should not call `listen()`.

## `server.ts`

Owns process startup:

```text
Load config
  ↓
Initialize infrastructure
  ↓
Create/import app
  ↓
app.listen()
```

This makes API integration testing easier because tests can import the Express app without starting a real server.

---

# 11. Database Query Flow

When the Audit module is implemented:

```text
HTTP Request
     |
     v
Route
     |
     v
Controller
     |
     v
Application / Use Case
     |
     v
Domain Rules
     |
     v
Repository
     |
     v
Mongoose Model
     |
     v
MongoDB Atlas
```

Avoid putting database operations directly in routes.

Bad:

```text
Route
  ├── mongoose.find()
  ├── business logic
  └── response formatting
```

Preferred:

```text
Route
  ↓
Controller
  ↓
Use Case
  ↓
Repository
  ↓
Mongoose
```

---

# 12. Redis + BullMQ Flow

Redis is used as the queue backend.

```text
API
 |
 v
BullMQ
 |
 v
Redis
 |
 | waiting job
 v
Worker
 |
 v
Processor
```

Example:

```text
POST /audits
   ↓
Create Audit
   ↓
Persist Audit
   ↓
Enqueue Job
   ↓
BullMQ / Redis
   ↓
Crawl Worker
```

---

# 13. API vs Worker Responsibilities

### API

```text
Authentication
Authorization
Request validation
Audit creation
Data retrieval
Queue job creation
Progress retrieval
Proposal retrieval
Export / Share requests
```

### Worker

```text
Crawling
Evidence
Screenshots
Analysis
AI
Recommendations
Strategy
Proposal generation
```

Avoid doing heavy work inside an HTTP request.

Prefer:

```text
HTTP request
   ↓
Create record
   ↓
Enqueue job
   ↓
Return 202
   ↓
Worker processes asynchronously
```

---

# 14. End-to-End Audit Flow

```text
1. User enters website URL
          |
          v
2. React sends POST /audits
          |
          v
3. API validates request
          |
          v
4. API creates Audit
          |
          v
5. API enqueues audit job
          |
          v
6. API returns async response
          |
          v
7. Crawl Worker starts
          |
          v
8. Crawl + evidence collection
          |
          v
9. Screenshots / artifacts stored
          |
          v
10. Evidence persisted
          |
          v
11. Analysis Worker
          |
          v
12. Deterministic rules
          |
          v
13. Findings persisted
          |
          v
14. AI Worker
          |
          v
15. Recommendations
          |
          v
16. Redesign strategy
          |
          v
17. Proposal Worker
          |
          v
18. Proposal persisted
          |
          v
19. User reviews proposal
          |
          v
20. Export / Share
```

---

# 15. Evidence → Analysis → AI Boundary

This boundary is fundamental to AuditPilot.

```text
Raw Website
     |
     v
Crawl
     |
     v
Evidence
     |
     v
Deterministic Analysis
     |
     v
Structured Findings
     |
     v
AI Context Builder
     |
     v
AI
     |
     v
Validated Recommendations
```

The AI should not blindly receive an entire raw website and invent findings.

---

# 16. Health and Readiness

Initial health check:

```text
GET /health
   ↓
API process alive
```

Later:

```json
{
  "status": "ok",
  "dependencies": {
    "mongodb": "up",
    "redis": "up"
  }
}
```

Think of:

```text
Liveness
→ Is the process alive?

Readiness
→ Can the application safely serve requests?
```

---

# 17. Error Flow

```text
Request
  |
  v
Validation
  |
  +---- invalid ----------> 400
  |
  v
Authentication
  |
  +---- invalid ----------> 401
  |
  v
Authorization
  |
  +---- denied -----------> 403
  |
  v
Business logic
  |
  +---- not found --------> 404
  |
  +---- conflict ----------> 409
  |
  +---- dependency failure -> 5xx / controlled error
  |
  v
Response
```

Use a centralized error model.

---

# 18. Observability Flow

Major operations should carry:

```text
requestId
userId
auditId
jobId
```

Example:

```text
HTTP Request
   |
   +-- requestId
   |
   v
Create Audit
   |
   +-- auditId
   |
   v
BullMQ Job
   |
   +-- jobId
   |
   v
Worker
   |
   v
Crawl
   |
   v
Analysis
   |
   v
AI
   |
   v
Proposal
```

This gives us end-to-end traceability.

---

# 19. Implementation Order

Build AuditPilot incrementally:

```text
1. Repository / monorepo
2. Configuration
3. MongoDB connection
4. Redis connection
5. BullMQ connection
6. Health / readiness
7. Authentication
8. Audit module
9. Queue audit job
10. Crawl worker
11. Evidence storage
12. Deterministic analysis
13. AI worker
14. Recommendations
15. Redesign strategy
16. Proposal
17. Export / Share
18. Testing
19. Deployment
```

---

# 20. Current Status

Already completed:

```text
Repository / monorepo       ✅
pnpm workspace              ✅
React foundation            ✅
Express foundation         ✅
Worker foundation           ✅
GitHub personal repository  ✅
Personal Git identity       ✅
Personal SSH authentication ✅
```

Current implementation:

```text
Configuration
     ↓
MongoDB + Mongoose
     ↓
Redis
     ↓
BullMQ
```

---

# 21. MongoDB Milestone — Definition of Done

```text
[ ] MongoDB Atlas cluster exists
[ ] AuditPilot database is available
[ ] Mongoose installed
[ ] MONGODB_URI exists in .env
[ ] MONGODB_URI is blank in .env.example
[ ] mongodb.ts exists
[ ] MongoDB connects during API startup
[ ] Initial DB failure prevents API startup
[ ] Secrets are never logged
[ ] API health endpoint still works
[ ] DB connection is separated from business logic
```

---

# 22. File Placement Mental Model

When unsure where code belongs, ask:

```text
Is it UI?
    -> apps/web

Is it HTTP/API?
    -> apps/api

Is it long-running/background work?
    -> apps/workers

Is it business/domain logic?
    -> packages/domain

Is it shared data shape?
    -> packages/contracts

Is it validation?
    -> packages/validation

Is it configuration?
    -> packages/config

Is it security?
    -> packages/security

Is it database/cloud integration?
    -> apps/*/infrastructure

Is it cross-cutting telemetry?
    -> packages/observability
```

---

# 23. Golden Rules

### Rule 1 — Centralize environment access

```text
process.env
     ↓
@auditpilot/config
```

### Rule 2 — Separate infrastructure

```text
infrastructure/
  ├── mongodb
  ├── redis
  ├── queues
  └── storage
```

### Rule 3 — Routes should not own database logic

```text
Route
  → Controller
  → Use Case
  → Repository
  → Database
```

### Rule 4 — API should not perform long-running processing

```text
API
  → Queue
  → Worker
```

### Rule 5 — AI is downstream of trusted structured findings

```text
Evidence
  → Deterministic Analysis
  → Findings
  → AI
```

### Rule 6 — Keep secrets out of Git

```text
.env          ❌
.env.example  ✅
```

---

## Immediate Next Step

Before implementing `mongodb.ts`, verify the shared configuration package and API type-check:

```powershell
pnpm --filter @auditpilot/config typecheck
pnpm --filter api typecheck
```

Both should pass.

Then implement:

```text
.env
  ↓
@auditpilot/config
  ↓
mongodb.ts
  ↓
Mongoose
  ↓
MongoDB Atlas
```

Only after MongoDB is working should Redis and BullMQ be added.
