const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { createActionItem, updateStatus, listActionItems, getOverdueItems } = require('../controllers/actionItemsController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authMiddleware);

router.get('/overdue', getOverdueItems);

router.get('/', listActionItems);

router.post(
  '/',
  [
    body('task').notEmpty().withMessage('Task description is required'),
    body('assignee').notEmpty().withMessage('Assignee name is required'),
    body('assigneeEmail').optional().isEmail().withMessage('assigneeEmail must be a valid email'),
    body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid ISO 8601 date'),
    body('meetingId').optional().isUUID().withMessage('meetingId must be a valid UUID'),
    body('citations').optional().isArray().withMessage('citations must be an array'),
  ],
  validate,
  createActionItem
);

router.patch(
  '/:id/status',
  [
    param('id').isUUID().withMessage('Invalid action item ID'),
    body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED']).withMessage('Status must be PENDING, IN_PROGRESS, or COMPLETED'),
  ],
  validate,
  updateStatus
);

module.exports = router;
