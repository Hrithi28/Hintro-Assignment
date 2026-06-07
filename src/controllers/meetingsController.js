const { v4: uuidv4 } = require('uuid');
const { get, query, run } = require('../db');
const { success, error } = require('../utils/response');
const aiService = require('../services/aiService');

function parseMeeting(row) {
  if (!row) return null;
  return {
    ...row,
    participants: JSON.parse(row.participants),
    transcript: JSON.parse(row.transcript),
  };
}

async function createMeeting(req, res) {
  const { title, participants, meetingDate, transcript } = req.body;
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  run(
    'INSERT INTO meetings (id, title, participants, meeting_date, transcript, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, title, JSON.stringify(participants), meetingDate, JSON.stringify(transcript), req.user.id, createdAt]
  );

  const meeting = parseMeeting(get('SELECT * FROM meetings WHERE id = ?', [id]));
  return success(res, { meeting }, 201);
}

async function getMeeting(req, res) {
  const row = get('SELECT * FROM meetings WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!row) return error(res, 'NOT_FOUND', 'Meeting not found', 404);

  const meeting = parseMeeting(row);

  // Attach analysis if exists
  const analysis = get('SELECT * FROM meeting_analyses WHERE meeting_id = ?', [req.params.id]);
  if (analysis) {
    meeting.analysis = {
      summary: JSON.parse(analysis.summary),
      decisions: JSON.parse(analysis.decisions),
      followUps: JSON.parse(analysis.follow_ups),
      analyzedAt: analysis.analyzed_at,
    };
  }

  // Attach action items
  const items = query('SELECT * FROM action_items WHERE meeting_id = ?', [req.params.id]);
  meeting.actionItems = items.map(i => ({ ...i, citations: JSON.parse(i.citations) }));

  return success(res, { meeting });
}

async function listMeetings(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const offset = (page - 1) * limit;
  const { title } = req.query;

  let where = 'user_id = ?';
  const params = [req.user.id];
  if (title) { where += ' AND LOWER(title) LIKE LOWER(?)'; params.push(`%${title}%`); }

  const countRow = get(`SELECT COUNT(*) as count FROM meetings WHERE ${where}`, params);
  const total = countRow ? countRow.count : 0;

  const rows = query(
    `SELECT * FROM meetings WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const meetings = rows.map(parseMeeting);

  return success(res, {
    meetings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

async function analyzeMeeting(req, res) {
  const row = get('SELECT * FROM meetings WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!row) return error(res, 'NOT_FOUND', 'Meeting not found', 404);

  const meeting = parseMeeting(row);

  const logger = res.locals.logger;
  logger.info('Starting AI analysis', { meetingId: meeting.id });

  try {
    const analysis = await aiService.analyzeMeeting(meeting);

    // Upsert analysis
    const existingAnalysis = get('SELECT id FROM meeting_analyses WHERE meeting_id = ?', [meeting.id]);
    const analysisId = existingAnalysis ? existingAnalysis.id : uuidv4();
    const analyzedAt = new Date().toISOString();

    if (existingAnalysis) {
      run(
        'UPDATE meeting_analyses SET summary = ?, decisions = ?, follow_ups = ?, analyzed_at = ? WHERE meeting_id = ?',
        [JSON.stringify(analysis.summary), JSON.stringify(analysis.decisions), JSON.stringify(analysis.followUps), analyzedAt, meeting.id]
      );
    } else {
      run(
        'INSERT INTO meeting_analyses (id, meeting_id, summary, decisions, follow_ups, analyzed_at) VALUES (?, ?, ?, ?, ?, ?)',
        [analysisId, meeting.id, JSON.stringify(analysis.summary), JSON.stringify(analysis.decisions), JSON.stringify(analysis.followUps), analyzedAt]
      );
    }

    // Insert action items from analysis
    const createdItems = [];
    for (const item of analysis.actionItems) {
      const itemId = uuidv4();
      const now = new Date().toISOString();
      run(
        'INSERT INTO action_items (id, meeting_id, task, assignee, assignee_email, due_date, status, citations, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [itemId, meeting.id, item.task, item.assignee, item.assigneeEmail || null, item.dueDate || null, 'PENDING', JSON.stringify(item.citations || []), req.user.id, now, now]
      );
      createdItems.push({ id: itemId, ...item, status: 'PENDING' });
    }

    logger.info('AI analysis complete', { meetingId: meeting.id, actionItemCount: createdItems.length });

    return success(res, {
      analysis: {
        summary: analysis.summary,
        actionItems: createdItems,
        decisions: analysis.decisions,
        followUps: analysis.followUps,
        analyzedAt,
      },
    });
  } catch (err) {
    logger.error('AI analysis failed', { error: err.message });
    return error(res, 'AI_ERROR', 'Failed to analyze meeting: ' + err.message, 500);
  }
}

module.exports = { createMeeting, getMeeting, listMeetings, analyzeMeeting };
