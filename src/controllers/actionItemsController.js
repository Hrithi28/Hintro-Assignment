const { v4: uuidv4 } = require('uuid');
const { get, query, run } = require('../db');
const { success, error } = require('../utils/response');

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

function parseItem(row) {
  if (!row) return null;
  return { ...row, citations: JSON.parse(row.citations) };
}

async function createActionItem(req, res) {
  const { meetingId, task, assignee, assigneeEmail, dueDate, citations } = req.body;

  if (meetingId) {
    const meeting = get('SELECT id FROM meetings WHERE id = ? AND user_id = ?', [meetingId, req.user.id]);
    if (!meeting) return error(res, 'NOT_FOUND', 'Meeting not found', 404);
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  run(
    'INSERT INTO action_items (id, meeting_id, task, assignee, assignee_email, due_date, status, citations, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, meetingId || null, task, assignee, assigneeEmail || null, dueDate || null, 'PENDING', JSON.stringify(citations || []), req.user.id, now, now]
  );

  return success(res, { actionItem: parseItem(get('SELECT * FROM action_items WHERE id = ?', [id])) }, 201);
}

async function updateStatus(req, res) {
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return error(res, 'VALIDATION_ERROR', `Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  const item = get('SELECT * FROM action_items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!item) return error(res, 'NOT_FOUND', 'Action item not found', 404);

  const now = new Date().toISOString();
  run('UPDATE action_items SET status = ?, updated_at = ? WHERE id = ?', [status, now, req.params.id]);

  return success(res, { actionItem: parseItem(get('SELECT * FROM action_items WHERE id = ?', [req.params.id])) });
}

async function listActionItems(req, res) {
  const { status, assignee, meetingId, page = 1, limit = 10 } = req.query;

  let where = 'user_id = ?';
  const params = [req.user.id];

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return error(res, 'VALIDATION_ERROR', `Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }
    where += ' AND status = ?';
    params.push(status);
  }
  if (assignee) {
    where += ' AND LOWER(assignee) = LOWER(?)';
    params.push(assignee);
  }
  if (meetingId) {
    where += ' AND meeting_id = ?';
    params.push(meetingId);
  }

  const countRow = get(`SELECT COUNT(*) as count FROM action_items WHERE ${where}`, params);
  const total = countRow ? countRow.count : 0;

  const lim = Math.min(parseInt(limit) || 10, 100);
  const offset = (parseInt(page) - 1) * lim;

  const rows = query(
    `SELECT * FROM action_items WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, lim, offset]
  );

  return success(res, {
    actionItems: rows.map(parseItem),
    pagination: { page: parseInt(page), limit: lim, total, totalPages: Math.ceil(total / lim) },
  });
}

async function getOverdueItems(req, res) {
  const now = new Date().toISOString();
  const rows = query(
    "SELECT * FROM action_items WHERE user_id = ? AND status != 'COMPLETED' AND due_date IS NOT NULL AND due_date < ?",
    [req.user.id, now]
  );
  return success(res, { actionItems: rows.map(parseItem), count: rows.length });
}

module.exports = { createActionItem, updateStatus, listActionItems, getOverdueItems };
