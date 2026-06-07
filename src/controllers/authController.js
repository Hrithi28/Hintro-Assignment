const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { get, run } = require('../db');
const { success, error } = require('../utils/response');

async function register(req, res) {
  const { email, password, name } = req.body;

  const existing = get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return error(res, 'CONFLICT', 'Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  run(
    'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, email, passwordHash, name, createdAt]
  );

  const token = jwt.sign(
    { id, email, name },
    process.env.JWT_SECRET || 'hintro-secret-key',
    { expiresIn: '7d' }
  );

  return success(res, { token, user: { id, email, name } }, 201);
}

async function login(req, res) {
  const { email, password } = req.body;

  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return error(res, 'UNAUTHORIZED', 'Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return error(res, 'UNAUTHORIZED', 'Invalid credentials', 401);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || 'hintro-secret-key',
    { expiresIn: '7d' }
  );

  return success(res, { token, user: { id: user.id, email: user.email, name: user.name } });
}

module.exports = { register, login };
