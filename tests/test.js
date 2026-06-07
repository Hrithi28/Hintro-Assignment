/**
 * Hintro API Test Suite
 * Run: node tests/test.js
 * 
 * Tests the full lifecycle: register → login → create meeting → analyze → action items → overdue
 */

const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';

let authToken = null;
let meetingId = null;
let actionItemId = null;

let passed = 0;
let failed = 0;

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, label, details = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${details ? ': ' + details : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== Hintro API Test Suite ===\n');

  // 1. Health check
  console.log('📋 Health Check');
  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health endpoint returns 200');
  assert(health.body.status === 'UP', 'Status is UP');

  // 2. Register
  console.log('\n📋 Authentication');
  const reg = await request('POST', '/api/auth/register', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: 'Test User',
  });
  assert(reg.status === 201, 'Register returns 201');
  assert(reg.body.success === true, 'Register success flag');
  assert(typeof reg.body.data?.token === 'string', 'Register returns token');
  assert(typeof reg.body.traceId === 'string', 'Response includes traceId');
  authToken = reg.body.data?.token;

  // Register duplicate
  const dup = await request('POST', '/api/auth/register', { email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test' });
  assert(dup.status === 409, 'Duplicate email returns 409');

  // Login
  const login = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
  assert(login.status === 200, 'Login returns 200');
  assert(typeof login.body.data?.token === 'string', 'Login returns token');

  // Wrong password
  const badLogin = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: 'wrongpass' });
  assert(badLogin.status === 401, 'Wrong password returns 401');

  // Validation error - bad email
  const badReg = await request('POST', '/api/auth/register', { email: 'not-an-email', password: 'pass123', name: 'X' });
  assert(badReg.status === 400, 'Invalid email returns 400');
  assert(badReg.body.error?.code === 'VALIDATION_ERROR', 'Validation error code present');

  // 3. Meetings
  console.log('\n📋 Meeting Management');

  // Protected route without token
  const unauth = await request('GET', '/api/meetings');
  assert(unauth.status === 401, 'Unauthenticated request returns 401');

  // Create meeting
  const create = await request('POST', '/api/meetings', {
    title: 'Sprint Planning Q3',
    participants: ['alice@example.com', 'bob@example.com'],
    meetingDate: '2026-05-20T10:00:00Z',
    transcript: [
      { timestamp: '00:05', speaker: 'Alice', text: 'We need to launch the new dashboard feature next Friday.' },
      { timestamp: '00:15', speaker: 'Bob', text: 'I will prepare the release notes and send them to the team.' },
      { timestamp: '00:25', speaker: 'Alice', text: 'We decided to skip the beta period and go straight to production.' },
      { timestamp: '00:35', speaker: 'Bob', text: 'Good call. I should also set up the monitoring alerts before launch.' },
    ],
  }, authToken);
  assert(create.status === 201, 'Create meeting returns 201');
  assert(create.body.data?.meeting?.id, 'Meeting has ID');
  meetingId = create.body.data?.meeting?.id;

  // Get meeting
  const get = await request('GET', `/api/meetings/${meetingId}`, null, authToken);
  assert(get.status === 200, 'Get meeting returns 200');
  assert(get.body.data?.meeting?.title === 'Sprint Planning Q3', 'Meeting title correct');

  // List meetings
  const list = await request('GET', '/api/meetings?page=1&limit=5', null, authToken);
  assert(list.status === 200, 'List meetings returns 200');
  assert(Array.isArray(list.body.data?.meetings), 'Returns meetings array');
  assert(list.body.data?.pagination?.total >= 1, 'Pagination total >= 1');

  // Invalid UUID
  const bad = await request('GET', '/api/meetings/not-a-uuid', null, authToken);
  assert(bad.status === 400, 'Invalid UUID returns 400');

  // 4. Action Items
  console.log('\n📋 Action Item Management');

  const aiCreate = await request('POST', '/api/action-items', {
    task: 'Set up CI/CD pipeline',
    assignee: 'Bob',
    assigneeEmail: 'bob@example.com',
    dueDate: '2025-01-01T00:00:00Z', // past date = overdue
    meetingId,
  }, authToken);
  assert(aiCreate.status === 201, 'Create action item returns 201');
  assert(aiCreate.body.data?.actionItem?.status === 'PENDING', 'Default status is PENDING');
  actionItemId = aiCreate.body.data?.actionItem?.id;

  // Update status
  const update = await request('PATCH', `/api/action-items/${actionItemId}/status`, { status: 'IN_PROGRESS' }, authToken);
  assert(update.status === 200, 'Update status returns 200');
  assert(update.body.data?.actionItem?.status === 'IN_PROGRESS', 'Status updated to IN_PROGRESS');

  // Invalid status
  const badStatus = await request('PATCH', `/api/action-items/${actionItemId}/status`, { status: 'INVALID' }, authToken);
  assert(badStatus.status === 400, 'Invalid status returns 400');

  // List with filters
  const filtered = await request('GET', '/api/action-items?status=IN_PROGRESS', null, authToken);
  assert(filtered.status === 200, 'Filter by status works');

  // Overdue (reset to PENDING with past due date)
  await request('PATCH', `/api/action-items/${actionItemId}/status`, { status: 'PENDING' }, authToken);
  const overdue = await request('GET', '/api/action-items/overdue', null, authToken);
  assert(overdue.status === 200, 'Overdue endpoint returns 200');
  assert(Array.isArray(overdue.body.data?.actionItems), 'Returns array');
  assert(overdue.body.data?.actionItems?.length >= 1, 'Overdue item detected');

  // 5. Evaluation endpoint
  console.log('\n📋 Evaluation Endpoint');
  const evalResp = await request('GET', '/api/evaluation');
  assert(evalResp.status === 200, 'Evaluation endpoint returns 200');
  assert(Array.isArray(evalResp.body.data?.features), 'Features array present');

  // 6. Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Tests: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner crashed:', err.message);
  process.exit(1);
});
