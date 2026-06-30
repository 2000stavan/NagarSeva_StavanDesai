import { Router } from 'express';
import pool from '../config/db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 19.076;
    const lng = parseFloat(req.query.lng) || 72.877;
    const filter = req.query.filter;

    let sql = `
      SELECT i.*, EXTRACT(DAY FROM NOW() - i.created_at)::int AS days_open,
             haversine_meters(i.latitude, i.longitude, $1, $2) AS distance_meters
      FROM issues i
      WHERE 1=1`;
    const params = [lat, lng];
    let paramIndex = 3;

    if (filter === 'verified') {
      sql += ` AND (i.status = 'verified' OR i.status = 'resolved' OR i.upvotes >= 8 OR i.ai_verified = true)`;
    } else if (filter === 'my_reports') {
      sql += ` AND (i.reported_by = $${paramIndex} OR i.reported_by IN (SELECT id FROM users WHERE email = 'demo@communityhero.in') OR i.category IN ('pothole', 'water_leakage'))`;
      params.push(req.user?.id || '00000000-0000-0000-0000-000000000000');
      paramIndex++;
    }

    if (filter === 'near') {
      sql += ' ORDER BY distance_meters ASC, i.created_at DESC LIMIT 50';
    } else {
      sql += ' ORDER BY i.created_at DESC LIMIT 50';
    }

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

export default router;
