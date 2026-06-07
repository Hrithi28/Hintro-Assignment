const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'UNAUTHORIZED', 'Missing or invalid authorization header', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'hintro-secret-key');
    req.user = payload;
    next();
  } catch (err) {
    return error(res, 'UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}

module.exports = authMiddleware;
