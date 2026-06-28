import { Router } from 'express';
import pool from '../config/db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    let sql = `
      SELECT u.id, u.name, u.civic_score, u.role,
             (SELECT COUNT(*)::int FROM issues WHERE reported_by = u.id) AS report_count,
             (SELECT COUNT(*)::int FROM issues WHERE reported_by = u.id AND status = 'resolved') AS resolved_count
      FROM users u
      WHERE u.role IN ('citizen', 'school_reporter')
      ORDER BY u.civic_score DESC
      LIMIT 10`;

    const { rows: top } = await pool.query(sql);

    const badges = await pool.query(
      `SELECT user_id, badge_key, badge_label FROM badges WHERE user_id = ANY($1)`,
      [top.map((u) => u.id)]
    );

    const badgeMap = {};
    for (const b of badges.rows) {
      if (!badgeMap[b.user_id]) badgeMap[b.user_id] = [];
      badgeMap[b.user_id].push(b);
    }

    const schoolLeaderboard = await pool.query(
      `SELECT id, name, community_service_hours, civic_score
       FROM users WHERE role = 'school_reporter'
       ORDER BY community_service_hours DESC LIMIT 10`
    );

    let currentRank = null;
    if (req.user) {
      const { rows: rank } = await pool.query(
        `SELECT rank FROM (
           SELECT id, RANK() OVER (ORDER BY civic_score DESC) AS rank
           FROM users WHERE role IN ('citizen','school_reporter')
         ) r WHERE id = $1`,
        [req.user.id]
      );
      currentRank = rank[0]?.rank ? parseInt(rank[0].rank) : null;
    }

    res.json({
      leaderboard: top.map((u, i) => ({
        ...u,
        rank: i + 1,
        badges: badgeMap[u.id] || [],
      })),
      school_leaderboard: schoolLeaderboard.rows,
      current_user_rank: currentRank,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
