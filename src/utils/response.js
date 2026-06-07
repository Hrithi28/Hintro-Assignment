function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    traceId: res.locals.traceId,
    success: true,
    data,
  });
}

function error(res, code, message, statusCode = 400, details = null) {
  const body = {
    traceId: res.locals.traceId,
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { success, error };
