# Hintro — Meeting Intelligence Service

AI-powered meeting intelligence that helps teams capture insights, action items, and decisions from conversations — with full citation grounding to prevent hallucinations.

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | SQLite via sql.js (pure JS, zero native deps) |
| AI | Groq (llama-3.3-70b-versatile) (llama-3.3-70b-versatile) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Scheduler | node-cron |
| Notifications | Discord Webhook |
| Docs | Swagger UI / OpenAPI 3.0 |

---

## Setup & Local Development

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/hintro.git
cd hintro
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
PORT=3000
NODE_ENV=development

JWT_SECRET=your-super-secret-jwt-key

# Get from https://console.anthropic.com
GROQ_API_KEY=sk-ant-...

# Discord: Server → Channel → Edit → Integrations → Webhooks → New
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

CANDIDATE_NAME=Your Name
CANDIDATE_EMAIL=you@example.com
REPO_URL=https://github.com/yourusername/hintro
DEPLOYED_URL=https://your-app.onrender.com
```

### 3. Run Locally

```bash
npm start
# or with auto-reload:
npm run dev
```

Server starts at `http://localhost:3000`  
Swagger UI at `http://localhost:3000/api-docs`

### 4. Run Tests

```bash
npm test
```

---

## API Usage Examples

### Register & Login

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123","name":"Alice"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'
# → Returns { data: { token: "eyJ..." } }
```

### Create Meeting

```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sprint Planning",
    "participants": ["alice@example.com", "bob@example.com"],
    "meetingDate": "2026-05-20T10:00:00Z",
    "transcript": [
      {"timestamp": "00:10", "speaker": "Alice", "text": "We should launch next Friday."},
      {"timestamp": "00:20", "speaker": "Bob", "text": "I will prepare release notes."}
    ]
  }'
```

### AI Analysis

```bash
curl -X POST http://localhost:3000/api/meetings/MEETING_ID/analyze \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Action Items

```bash
# List overdue
curl http://localhost:3000/api/action-items/overdue \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update status
curl -X PATCH http://localhost:3000/api/action-items/ITEM_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'
```

---

## Deployment (Render)

1. Push code to GitHub
2. New Web Service on [render.com](https://render.com)
3. Build command: `npm install`
4. Start command: `node src/app.js`
5. Add all env vars from `.env.example` in the Environment tab
6. The SQLite data file is ephemeral on Render's free tier; use a paid plan or switch to PostgreSQL for production persistence

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `GROQ_API_KEY` | Yes | API key for Claude AI |
| `DISCORD_WEBHOOK_URL` | Yes | Discord webhook for reminders |
| `REMINDER_CRON` | No | Cron schedule (default: `0 9 * * *`) |
| `CANDIDATE_NAME` | No | Displayed on evaluation endpoint |
| `CANDIDATE_EMAIL` | No | Displayed on evaluation endpoint |
| `REPO_URL` | No | GitHub repo URL |
| `DEPLOYED_URL` | No | Live deployment URL |
