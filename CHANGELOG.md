# Changelog

## [1.0.0] — 2026-06-05

### Initial Release

#### Milestone 1: Project Scaffold
- Express.js application with structured folder layout
- sql.js SQLite database with schema initialization
- Unified API response format (`{ traceId, success, data/error }`)
- Request trace ID middleware (generates UUID, attaches to all responses)
- Structured JSON logging with trace ID, method, path, status
- Global error handler middleware

#### Milestone 2: Authentication
- `POST /api/auth/register` with bcrypt password hashing
- `POST /api/auth/login` with JWT token generation (7d expiry)
- JWT auth middleware protecting all meeting/action-item routes
- Input validation: email format, password length, required fields

#### Milestone 3: Meeting Management
- `POST /api/meetings` — create meeting with transcript
- `GET /api/meetings/:id` — retrieve with analysis and action items
- `GET /api/meetings` — paginated list
- Full input validation: participant emails, ISO 8601 dates, transcript structure

#### Milestone 4: AI Analysis with Citation Grounding
- `POST /api/meetings/:id/analyze` — calls Claude via Anthropic API
- Structured prompt with explicit anti-hallucination constraints
- Post-parse validation: every item must have citations; timestamps must exist in transcript
- Upsert analysis (re-analysis overwrites previous)
- Extracts and stores action items with citations

#### Milestone 5: Action Item Management
- `POST /api/action-items` — manual creation
- `PATCH /api/action-items/:id/status` — status transitions (PENDING / IN_PROGRESS / COMPLETED)
- `GET /api/action-items` — list with filters (status, assignee, meetingId) and pagination
- `GET /api/action-items/overdue` — non-completed items past their due date

#### Milestone 6: Scheduled Reminders + Discord Integration
- `node-cron` scheduler running at 9 AM daily (configurable via `REMINDER_CRON`)
- Identifies overdue items not reminded in last 24 hours
- Discord rich embed notifications per overdue item
- Batch summary embed after individual notifications
- `reminder_history` table records all notification attempts with success/failure

#### Milestone 7: Documentation
- OpenAPI 3.0 YAML spec at `docs/openapi.yaml`
- Swagger UI served at `/api-docs`
- `/health` and `/api/evaluation` endpoints
- README, DECISIONS, AI_APPROACH, TESTING, CHANGELOG, CHECKLIST
- Integration test suite (`tests/test.js`) with no external dependencies
