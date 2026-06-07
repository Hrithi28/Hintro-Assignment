const { generateTraceId, createLogger } = require('../utils/logger');

function traceMiddleware(req, res, next) {
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  res.locals.traceId = traceId;
  res.setHeader('x-trace-id', traceId);

  const logger = createLogger(traceId);
  res.locals.logger = logger;

  logger.info('Request received', {
    method: req.method,
    path: req.path,
  });

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    logger.info('Response sent', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
    });
    return originalJson(body);
  };

  next();
}

module.exports = traceMiddleware;
