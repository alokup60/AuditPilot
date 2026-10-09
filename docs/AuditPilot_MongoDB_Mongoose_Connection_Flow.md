# AuditPilot — MongoDB + Mongoose Connection Flow

This document describes the MongoDB connection process for AuditPilot.

Use it as the implementation reference for the MongoDB foundation milestone.

---

## 1. Goal

Connect the AuditPilot Node.js + Express API to MongoDB Atlas through Mongoose.

The target flow is:

```text
.env
  ↓
@auditpilot/config
  ↓
MongoDB URI
  ↓
mongodb.ts
  ↓
Mongoose
  ↓
MongoDB Atlas
```

---

## 2. Components Involved

```text
AuditPilot/
│
├── .env
├── .env.example
│
└── apps/
    └── api/
        └── src/
            ├── app.ts
            ├── server.ts
            └── infrastructure/
                └── mongodb.ts
```

### Responsibility

| Component            | Responsibility                                |
| -------------------- | --------------------------------------------- |
| `.env`               | Local secret/config values                    |
| `.env.example`       | Safe configuration template                   |
| `@auditpilot/config` | Validate and expose environment configuration |
| `mongodb.ts`         | Establish MongoDB connection                  |
| `server.ts`          | Startup orchestration                         |
| Mongoose             | MongoDB driver/ODM layer                      |
| MongoDB Atlas        | Persistent database                           |

---

## 3. Environment Flow

The local MongoDB URI belongs in `.env`.

Example:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=<real-local-value>
```

The real URI must never be committed.

`.env.example` should contain only:

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=
```

Git rules:

```text
.env          → ignored
.env.example  → committed
```

---

## 4. Configuration Flow

Do not access the environment directly from `mongodb.ts`.

Preferred flow:

```text
process.env
    ↓
@auditpilot/config
    ↓
Zod validation
    ↓
typed configuration
    ↓
config.mongodb.uri
```

The application should consume:

```ts
config.mongodb.uri;
```

instead of:

```ts
process.env.MONGODB_URI;
```

This keeps environment access centralized.

---

## 5. MongoDB Connection Module

File:

```text
apps/api/src/infrastructure/mongodb.ts
```

This file is an infrastructure module.

Its responsibilities are:

```text
1. Read MongoDB URI from config
2. Verify required configuration exists
3. Call Mongoose connection
4. Wait for the connection
5. Report successful connection
6. Throw on initial connection failure
```

It should not contain:

```text
Audit business logic
Finding business logic
Proposal logic
HTTP routes
Controllers
Repository queries
```

---

## 6. Why Infrastructure Is Separate

Keep technical details away from business logic.

Preferred:

```text
API startup
   ↓
connectMongoDB()
   ↓
Mongoose
   ↓
MongoDB Atlas
```

Later:

```text
Audit use case
   ↓
Audit repository
   ↓
Mongoose model
   ↓
MongoDB
```

This allows the business/domain layer to remain independent from database connection details.

---

## 7. API Startup Lifecycle

The intended startup flow is:

```text
Node process starts
       ↓
Load configuration
       ↓
Validate configuration
       ↓
Connect to MongoDB
       ↓
MongoDB connection succeeds?
       │
       ├── NO
       │    ↓
       │  Log startup error
       │    ↓
       │  Stop process
       │
       └── YES
            ↓
        Create Express app
            ↓
        Register middleware
            ↓
        Register routes
            ↓
        Start HTTP server
            ↓
        API ready
```

### Fail-fast rule

The API should not announce itself as ready if its required database is unavailable.

Bad:

```text
MongoDB ❌
API     ✅ listening
```

Preferred:

```text
MongoDB ❌
API     ❌ startup stopped
```

---

## 8. `app.ts` vs `server.ts`

### `app.ts`

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

It should not call:

```ts
app.listen(...)
```

### `server.ts`

Owns process startup:

```text
Load config
  ↓
Initialize infrastructure
  ↓
Create/import app
  ↓
Listen on configured port
```

This separation also makes automated testing easier.

---

## 9. Mongoose Connection

The core operation is conceptually:

```text
config.mongodb.uri
       ↓
mongoose.connect(...)
       ↓
connection established
```

Modern Mongoose versions do not require the old connection options that were common in older examples.

Do not add outdated options unless there is a specific compatibility requirement.

---

## 10. Safe Logging

Successful connection:

```text
MongoDB connected
```

Safe.

Never log:

```text
MongoDB URI
Username
Password
Full connection string
```

Unsafe example:

```ts
console.log(config.mongodb.uri);
```

Do not do this.

---

## 11. Connection Failure

If the URI is missing:

```text
Configuration invalid
      ↓
Startup failure
```

If MongoDB is unreachable:

```text
Mongoose connection error
      ↓
Startup failure
```

Do not silently catch and ignore the error.

Avoid:

```text
connect failed
   ↓
ignore
   ↓
start API anyway
```

---

## 12. Testing the Connection

### Success case

Use a valid MongoDB Atlas URI:

```text
.env
  ↓
Mongoose
  ↓
MongoDB Atlas
  ↓
connected
  ↓
API starts
```

Expected:

```text
MongoDB connected
API listening on http://localhost:4000
```

### Failure case

Temporarily use an invalid URI:

```env
MONGODB_URI=invalid
```

Expected:

```text
MongoDB connection fails
        ↓
API startup fails
```

The API should not continue listening normally.

Restore the real value after testing.

---

## 13. Health Endpoint

Current health endpoint:

```text
GET /health
```

Initially this can mean:

```json
{
  "status": "ok"
}
```

That checks application liveness.

Later we can add dependency-aware readiness:

```json
{
  "status": "ok",
  "dependencies": {
    "mongodb": "up",
    "redis": "up"
  }
}
```

Do not mix full dependency health logic into the MongoDB connection module.

---

## 14. Security Rules

Never commit:

```text
.env
```

Never hard-code:

```text
MongoDB username
MongoDB password
MongoDB URI
```

Never log credentials.

Use:

```text
.env
   ↓
config
   ↓
mongodb.ts
```

---

## 15. Current Dependency Flow

At this milestone:

```text
@auditpilot/config
        ↓
mongodb.ts
        ↓
Mongoose
        ↓
MongoDB Atlas
```

The API startup depends on successful MongoDB initialization.

Redis and BullMQ are separate future infrastructure steps.

---

## 16. Future Infrastructure Structure

After Redis and storage are added, the infrastructure layer will look approximately like:

```text
apps/api/src/infrastructure/
│
├── mongodb.ts
├── redis.ts
├── queues.ts
└── storage.ts
```

Responsibilities remain separated:

```text
mongodb.ts → MongoDB / Mongoose
redis.ts   → Redis connection
queues.ts  → BullMQ configuration
storage.ts → AWS S3
```

---

## 17. Implementation Order

Build this milestone in the following order:

```text
1. Install Mongoose
2. Add MONGODB_URI to local .env
3. Keep .env.example secret-free
4. Create mongodb.ts
5. Implement connectMongoDB()
6. Update server.ts startup lifecycle
7. Run typecheck
8. Start API
9. Verify MongoDB connection
10. Test failure behavior
```

---

## 18. Verification Commands

Type-check the API:

```powershell
pnpm --filter api typecheck
```

Start the API:

```powershell
pnpm --filter api dev
```

Verify the health endpoint:

```text
http://localhost:4000/health
```

Expected:

```json
{
  "status": "ok"
}
```

---

## 19. Definition of Done

```text
[ ] Mongoose installed
[ ] MongoDB Atlas cluster available
[ ] MONGODB_URI exists in .env
[ ] .env.example contains no real credentials
[ ] mongodb.ts created
[ ] connectMongoDB() implemented
[ ] server.ts initializes MongoDB before listen()
[ ] API typecheck passes
[ ] API starts with valid MongoDB configuration
[ ] API fails fast with invalid MongoDB configuration
[ ] Credentials are never logged
[ ] Health endpoint still works
```

---

## 20. Mental Model

Remember this simple chain:

```text
Environment
    ↓
Configuration
    ↓
Infrastructure
    ↓
Database
    ↓
Application
```

For AuditPilot:

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
  ↓
Express API
```

This is the complete MongoDB foundation flow.
