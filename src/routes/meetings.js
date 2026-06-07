const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { createMeeting, getMeeting, listMeetings, analyzeMeeting } = require('../controllers/meetingsController');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authMiddleware);

router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Meeting title is required'),
    body('participants').isArray({ min: 1 }).withMessage('At least one participant is required'),
    body('participants.*').isEmail().withMessage('All participants must be valid email addresses'),
    body('meetingDate').isISO8601().withMessage('meetingDate must be a valid ISO 8601 date'),
    body('transcript').isArray().withMessage('Transcript must be an array'),
    body('transcript.*.timestamp').notEmpty().withMessage('Each transcript entry needs a timestamp'),
    body('transcript.*.speaker').notEmpty().withMessage('Each transcript entry needs a speaker'),
    body('transcript.*.text').notEmpty().withMessage('Each transcript entry needs text'),
  ],
  validate,
  createMeeting
);

router.get('/', listMeetings);

router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid meeting ID')],
  validate,
  getMeeting
);

router.post(
  '/:id/analyze',
  [param('id').isUUID().withMessage('Invalid meeting ID')],
  validate,
  analyzeMeeting
);

module.exports = router;
