# Technical Decisions

## 1. Database: SQLite via sql.js

**Choice:** SQLite using the `sql.js` pure-JavaScript library

**Why:**
- Zero native compilation required — works on any Node environment including Render, Railway, Fly.io free tiers without build toolchain setup
- SQLite is sufficient for this assignment's scale and provides full SQL semantics (joins, transactions, foreign keys)
- `sql.js` is compiled from the official SQLite C source to WebAssembly, so it is functionally identical to native SQLite

**Alternatives considered:**
- `better-sqlite3`: faster (native C binding), but requires `node-gyp` and Python build tools which failed in the target environment
- PostgreSQL: production-grade, but requires a managed database service and adds infrastructure complexity disproportionate to this assignment
- MongoDB: flexible schema, but relational data (meetings → action items → citations) maps naturally to SQL

**Trade-offs:**
- sql.js loads the entire database into memory; fine for this scale, but not suitable for datasets exceeding available RAM
- SQLite is file-based, so horizontal scaling requires a shared filesystem or migration to a client-server DB

---

## 2. Authentication: JWT (JSON Web Tokens)

**Choice:** Stateless JWT with 7-day expiry, signed with HS256

**Why:**
- Stateless: no session store required, scales horizontally
- Simple to implement and well-understood
- Industry standard for REST APIs

**Alternatives considered:**
- Session-based auth: requires Redis/session store, adds infrastructure
- OAuth2: overkill for this assignment; better suited when social login or delegated access is needed

**Trade-offs:**
- JWTs cannot be revoked before expiry without a blocklist; acceptable for this use case
- Secrets must be rotated carefully in production

---

## 3. AI Provider: Groq (llama-3.3-70b-versatile)

**Choice:** `llama-3.3-70b-versatile` via Anthropic's Messages API

**Why:**
- Excellent instruction-following, critical for the citation grounding requirement
- Strong JSON output reliability
- Competitive pricing

**Alternatives considered:**
- OpenAI GPT-4o: equally capable, slightly higher cost
- Groq: ultra-fast inference but less reliable for strict JSON schema adherence
- Gemini: good option, slightly less tested for this structured output pattern

---

## 4. External Integration: Discord Webhook

**Choice:** Discord Webhook for reminder notifications

**Why:**
- No OAuth required — a webhook URL is a single environment variable
- Free, no account tier restrictions on webhooks
- Rich embed formatting for readable reminders
- Easy to test: create a server, add a channel, generate webhook

**Alternatives considered:**
- Slack Webhook: same simplicity, but requires a Slack workspace
- SendGrid/Resend email: requires domain verification and DNS setup
- Telegram Bot API: requires bot registration and chat ID management

---

## 5. Scheduler: node-cron

**Choice:** `node-cron` in-process scheduler

**Why:**
- Zero infrastructure — runs inside the existing Node process
- Standard cron syntax, configurable via environment variable
- Sufficient for this assignment's polling-based reminder pattern

**Alternatives considered:**
- BullMQ + Redis: better for high-volume job queues, but requires Redis
- External cron (GitHub Actions, Render cron jobs): requires separate configuration

**Trade-offs:**
- In-process scheduler stops when the server restarts; acceptable for this assignment, but production workloads benefit from a durable queue

---

## 6. Project Structure

```
src/
  app.js           # Express app + bootstrap
  db.js            # sql.js database layer
  controllers/     # Route handlers (thin layer, delegates to services)
  middleware/      # trace, auth, validate, errorHandler
  routes/          # Express routers with validation chains
  services/        # AI service, Discord service (business logic)
  jobs/            # Scheduled reminder job
  utils/           # Logger, response helpers
docs/
  openapi.yaml     # API specification
tests/
  test.js          # Integration test suite (no test framework dependency)
```

**Why this structure:**
- Controllers stay thin and testable
- Services encapsulate external dependencies (AI API, Discord)
- Middleware is composable and reusable
- No test framework dependency means tests run with `node tests/test.js`
