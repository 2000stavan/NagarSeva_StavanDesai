import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

router.get('/:id/score', async (req, res) => {
  try {
    const { rows: user } = await pool.query(
      'SELECT id, name, civic_score FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!user[0]) return res.status(404).json({ error: 'User not found' });

    const { rows: transactions } = await pool.query(
      'SELECT points, reason, created_at FROM score_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.params.id]
    );

    res.json({ ...user[0], transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch score' });
  }
});

router.get('/:id/service-hours', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT community_service_hours FROM users WHERE id = $1 AND role = $2',
      [req.params.id, 'school_reporter']
    );
    if (!rows[0]) return res.status(404).json({ error: 'School reporter not found' });

    const { rows: verified } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM issues
       WHERE reported_by = $1 AND status IN ('verified','in_progress','resolved')`,
      [req.params.id]
    );

    res.json({
      community_service_hours: rows[0].community_service_hours,
      verified_reports: verified[0].c,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch service hours' });
  }
});

router.get('/:id/badges', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT badge_key, badge_label, awarded_at FROM badges WHERE user_id = $1 ORDER BY awarded_at',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.get('/:id/issues', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, category, status, severity, created_at,
              EXTRACT(DAY FROM NOW() - created_at)::int AS days_open
       FROM issues WHERE reported_by = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user issues' });
  }
});

export default router;
