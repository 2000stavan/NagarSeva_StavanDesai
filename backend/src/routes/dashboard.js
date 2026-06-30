import { Router } from 'express';
import pool from '../config/db.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { detectSeasonalPatterns } from '../services/ai.js';
import { daysOpen } from '../services/scoring.js';

const router = Router();

router.get('/stats', authRequired, requireRole('authority', 'admin', 'ngo', 'journalist'), async (req, res) => {
  try {
    const [openCount, avgResolution, deptStats, escalated] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM issues WHERE status NOT IN ('resolved','rejected')`),
      pool.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400)::numeric(10,1) AS avg_days
         FROM issues WHERE status = 'resolved' AND resolved_at IS NOT NULL`
      ),
      pool.query(
        `SELECT i.assigned_department AS department,
                COUNT(*) FILTER (WHERE i.status NOT IN ('resolved','rejected'))::int AS open_count,
                AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 86400)
                  FILTER (WHERE i.status = 'resolved')::numeric(10,1) AS avg_days,
                COALESCE(AVG(sr.rating), 0)::numeric(3,2) AS satisfaction
         FROM issues i
         LEFT JOIN satisfaction_ratings sr ON sr.issue_id = i.id
         GROUP BY i.assigned_department
         ORDER BY open_count DESC`
      ),
      pool.query(`SELECT COUNT(*)::int AS c FROM issues WHERE escalation_level > 0 AND status NOT IN ('resolved','rejected')`),
    ]);

    const categoryBreakdown = await pool.query(
      `SELECT category, COUNT(*)::int AS count FROM issues
       WHERE status NOT IN ('resolved','rejected') GROUP BY category`
    );

    res.json({
      open_count: openCount.rows[0].c,
      avg_resolution_days: parseFloat(avgResolution.rows[0].avg_days) || 0,
      escalated_count: escalated.rows[0].c,
      departments: deptStats.rows,
      by_category: categoryBreakdown.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/seasonal', authRequired, requireRole('authority', 'admin', 'ngo', 'journalist'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT category,
              TO_CHAR(created_at, 'Mon') AS month,
              EXTRACT(MONTH FROM created_at)::int AS month_num,
              COUNT(*)::int AS count
       FROM issues
       WHERE created_at > NOW() - INTERVAL '24 months'
       GROUP BY category, TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
       ORDER BY month_num`
    );

    const monthlyData = {};
    for (const row of rows) {
      if (!monthlyData[row.category]) monthlyData[row.category] = {};
      monthlyData[row.category][row.month] = row.count;
    }

    const patterns = await detectSeasonalPatterns(monthlyData);
    res.json({ monthlyData, ...patterns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch seasonal data' });
  }
});

router.get('/aging', authRequired, requireRole('authority', 'admin', 'ngo', 'journalist'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, category, severity, status, assigned_department, escalation_level, created_at,
              EXTRACT(DAY FROM NOW() - created_at)::int AS days_open
       FROM issues
       WHERE status NOT IN ('resolved', 'rejected')
       ORDER BY created_at ASC`
    );

    const buckets = {
      '0-7': [],
      '7-30': [],
      '30-90': [],
      '90+': [],
    };

    for (const issue of rows) {
      const d = issue.days_open;
      if (d <= 7) buckets['0-7'].push(issue);
      else if (d <= 30) buckets['7-30'].push(issue);
      else if (d <= 90) buckets['30-90'].push(issue);
      else buckets['90+'].push(issue);
    }

    res.json({
      buckets,
      counts: {
        '0-7': buckets['0-7'].length,
        '7-30': buckets['7-30'].length,
        '30-90': buckets['30-90'].length,
        '90+': buckets['90+'].length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch aging data' });
  }
});

router.get('/satisfaction', authRequired, requireRole('authority', 'admin', 'ngo', 'journalist'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.assigned_department AS department,
              AVG(sr.rating)::numeric(3,2) AS avg_rating,
              COUNT(sr.id)::int AS rating_count
       FROM issues i
       JOIN satisfaction_ratings sr ON sr.issue_id = i.id
       GROUP BY i.assigned_department`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch satisfaction' });
  }
});

export default router;
