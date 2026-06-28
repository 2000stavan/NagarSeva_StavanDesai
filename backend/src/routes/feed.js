import { Router } from 'express';
import pool from '../config/db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 19.076;
    const lng = parseFloat(req.query.lng) || 72.877;
    const radius = parseFloat(req.query.radius) || 2000;
    const filter = req.query.filter;

    let sql = `
      SELECT i.*, EXTRACT(DAY FROM NOW() - i.created_at)::int AS days_open
      FROM issues i
      WHERE haversine_meters(i.latitude, i.longitude, $1, $2) <= $3`;
    const params = [lat, lng, radius];

    if (filter === 'verified') {
      sql += ` AND i.status = 'verified'`;
    } else if (filter === 'my_reports' && req.user) {
      sql += ` AND i.reported_by = $4`;
      params.push(req.user.id);
    }

    sql += ' ORDER BY i.created_at DESC LIMIT 50';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

export default router;
