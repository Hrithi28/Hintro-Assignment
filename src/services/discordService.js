const axios = require('axios');
const { createLogger } = require('../utils/logger');

const logger = createLogger('DISCORD_SERVICE');

async function sendReminderNotification(actionItem) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn('DISCORD_WEBHOOK_URL not configured, skipping notification');
    return { success: false, error: 'Webhook URL not configured' };
  }

  const dueDate = actionItem.due_date
    ? new Date(actionItem.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'No due date set';

  const statusEmoji = actionItem.status === 'PENDING' ? '⏳' : '🔄';

  const embed = {
    title: '⚠️ Overdue Action Item Reminder',
    color: 0xFF4444,
    fields: [
      { name: '📋 Task', value: actionItem.task, inline: false },
      { name: '👤 Assigned To', value: actionItem.assignee, inline: true },
      { name: `${statusEmoji} Status`, value: actionItem.status, inline: true },
      { name: '📅 Due Date', value: dueDate, inline: true },
    ],
    footer: { text: 'Hintro Meeting Intelligence • Reminder System' },
    timestamp: new Date().toISOString(),
  };

  if (actionItem.meeting_id) {
    embed.fields.push({ name: '🗓️ Meeting ID', value: actionItem.meeting_id, inline: false });
  }

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
    logger.info('Discord reminder sent', { actionItemId: actionItem.id });
    return { success: true };
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message;
    logger.error('Discord reminder failed', { error: errMsg, actionItemId: actionItem.id });
    return { success: false, error: errMsg };
  }
}

async function sendBatchReminderSummary(overdueItems) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  if (overdueItems.length === 0) return;

  const embed = {
    title: `📊 Overdue Summary: ${overdueItems.length} item(s) need attention`,
    color: 0xFF8800,
    description: overdueItems
      .slice(0, 10)
      .map((i, idx) => `**${idx + 1}.** ${i.task} → *${i.assignee}*`)
      .join('\n'),
    footer: { text: 'Hintro Meeting Intelligence • Scheduled Digest' },
    timestamp: new Date().toISOString(),
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
    logger.info('Discord batch summary sent', { count: overdueItems.length });
  } catch (err) {
    logger.error('Discord batch summary failed', { error: err.message });
  }
}

module.exports = { sendReminderNotification, sendBatchReminderSummary };
