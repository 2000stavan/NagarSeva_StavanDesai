import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, department: user.department },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'dev-secret');
    } catch {
      /* ignore */
    }
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, department, civic_score, community_service_hours, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0];
}
