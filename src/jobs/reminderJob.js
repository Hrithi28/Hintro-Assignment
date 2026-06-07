const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../db');
const discordService = require('../services/discordService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('REMINDER_JOB');

async function runReminderJob() {
  const traceId = uuidv4();
  const jobLogger = createLogger(traceId);
  jobLogger.info('Reminder job started');

  const now = new Date().toISOString();

  // Find all overdue, non-completed items
  const overdueItems = query(
    "SELECT * FROM action_items WHERE status != 'COMPLETED' AND due_date IS NOT NULL AND due_date < ?",
    [now]
  );

  jobLogger.info('Overdue items found', { count: overdueItems.length });

  if (overdueItems.length === 0) {
    jobLogger.info('No overdue items, skipping notifications');
    return;
  }

  // Send individual reminders for items not reminded in the last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let notificationsSent = 0;
  let notificationsFailed = 0;

  for (const item of overdueItems) {
    // Check if reminded recently
    const recentReminder = query(
      "SELECT id FROM reminder_history WHERE action_item_id = ? AND sent_at > ? AND success = 1",
      [item.id, twentyFourHoursAgo]
    );

    if (recentReminder.length > 0) {
      jobLogger.info('Skipping recently reminded item', { actionItemId: item.id });
      continue;
    }

    const result = await discordService.sendReminderNotification(item);

    // Record history
    run(
      'INSERT INTO reminder_history (id, action_item_id, sent_at, channel, success, error_message) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), item.id, new Date().toISOString(), 'discord', result.success ? 1 : 0, result.error || null]
    );

    if (result.success) {
      notificationsSent++;
    } else {
      notificationsFailed++;
    }
  }

  // Send a batch summary to Discord
  await discordService.sendBatchReminderSummary(overdueItems);

  jobLogger.info('Reminder job completed', {
    total: overdueItems.length,
    sent: notificationsSent,
    failed: notificationsFailed,
  });
}

function startReminderJob() {
  // Run every day at 9 AM
  const schedule = process.env.REMINDER_CRON || '0 9 * * *';
  logger.info('Scheduling reminder job', { schedule });

  cron.schedule(schedule, () => {
    runReminderJob().catch(err => {
      logger.error('Reminder job crashed', { error: err.message });
    });
  });

  // Also run once on startup in dev
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Running initial reminder check (dev mode)');
    setTimeout(() => {
      runReminderJob().catch(err => logger.error('Initial reminder check failed', { error: err.message }));
    }, 3000);
  }
}

module.exports = { startReminderJob, runReminderJob };
