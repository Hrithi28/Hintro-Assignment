const { createLogger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const traceId = res.locals.traceId || 'NO_TRACE';
  const logger = createLogger(traceId);

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    status: res.statusCode,
  });

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = statusCode === 500 ? 'An unexpected error occurred' : err.message;

  res.status(statusCode).json({
    traceId,
    success: false,
    error: {
      code,
      message,
    },
  });
}

module.exports = errorHandler;
