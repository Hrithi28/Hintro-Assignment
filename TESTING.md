# Testing

## Test Approach

Tests are written as an integration test suite (`tests/test.js`) with zero framework dependencies — run with plain `node`. Each test exercises a real HTTP request against the running server, covering the full request→controller→DB→response cycle.

## Running Tests

```bash
# Start the server first
npm start

# In another terminal:
npm test

# Or against a deployed URL:
TEST_URL=https://your-app.onrender.com npm test
```

## Test Scenarios

### Authentication
| Scenario | Expected |
|---|---|
| Register with valid data | 201, returns JWT token |
| Register duplicate email | 409 CONFLICT |
| Register with invalid email | 400 VALIDATION_ERROR |
| Login with correct credentials | 200, returns JWT |
| Login with wrong password | 401 UNAUTHORIZED |
| Access protected route without token | 401 UNAUTHORIZED |

### Meeting Management
| Scenario | Expected |
|---|---|
| Create meeting with full valid payload | 201, meeting object |
| Create meeting missing title | 400 VALIDATION_ERROR |
| Create meeting with invalid participant email | 400 VALIDATION_ERROR |
| Create meeting with invalid date format | 400 VALIDATION_ERROR |
| Get meeting by valid UUID | 200, meeting with transcript |
| Get meeting with invalid UUID format | 400 VALIDATION_ERROR |
| Get meeting not owned by user | 404 NOT_FOUND |
| List meetings with pagination | 200, pagination metadata |

### AI Analysis
| Scenario | Expected |
|---|---|
| Analyze meeting with transcript | 200, analysis with citations |
| All action items have citations | Verified in response |
| All summary items have citations | Verified in response |
| Timestamps in citations match transcript | Verified post-parse |
| Analyze non-existent meeting | 404 NOT_FOUND |

### Action Items
| Scenario | Expected |
|---|---|
| Create action item with valid data | 201, PENDING status |
| Create with invalid email | 400 VALIDATION_ERROR |
| Create with invalid date | 400 VALIDATION_ERROR |
| Update status to IN_PROGRESS | 200, updated status |
| Update status to invalid value | 400 VALIDATION_ERROR |
| List filtered by status | 200, filtered results |
| Get overdue items (past due_date, non-COMPLETED) | 200, includes item |

### Non-functional
| Scenario | Expected |
|---|---|
| Every response includes traceId | Verified on all calls |
| Error response uses `success: false` + `error.code` | Verified |
| Success response uses `success: true` + `data` | Verified |

## Edge Cases Considered

- Empty transcript array → meeting created, AI analysis returns empty arrays
- Transcript with one entry → minimal but valid analysis
- Action item with no due_date → not counted as overdue
- Completed action item with past due_date → NOT counted as overdue
- Reminder sent within 24 hours → not re-sent (deduplication)
- Invalid UUID in path → 400 before hitting DB

## Limitations Discovered

1. **AI analysis requires a real API key** — cannot be unit tested without mocking the Anthropic client. The test suite skips the analyze endpoint to avoid API costs during automated testing.

2. **sql.js in-memory + file sync** — concurrent requests in load tests could theoretically race on the file write. Not an issue for single-process assignment workloads.

3. **Cron job timing** — the reminder job cannot be meaningfully tested in a short test run. Manual verification via the Discord channel is required.
