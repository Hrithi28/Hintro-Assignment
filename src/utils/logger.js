const { v4: uuidv4 } = require('uuid');

function createLogger(traceId) {
  const log = (level, message, meta = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      traceId: traceId || 'NO_TRACE',
      message,
      ...meta,
    };
    console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
  };

  return {
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
  };
}

function generateTraceId() {
  return uuidv4();
}

module.exports = { createLogger, generateTraceId };
