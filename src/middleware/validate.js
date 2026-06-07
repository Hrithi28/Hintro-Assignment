const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({ field: e.path, message: e.msg }));
    return error(res, 'VALIDATION_ERROR', 'Validation failed', 400, details);
  }
  next();
}

module.exports = validate;
