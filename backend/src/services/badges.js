import pool from '../config/db.js';

async function getUserStats(userId, client = pool) {
  const q = client.query.bind(client);

  const [reports, verifiedReports, upvotes, sponsoredResolved, anonymousReports, score, rank] =
    await Promise.all([
      q('SELECT COUNT(*)::int AS c FROM issues WHERE reported_by = $1', [userId]),
      q(
        `SELECT COUNT(*)::int AS c FROM issues WHERE reported_by = $1 AND status IN ('verified','in_progress','resolved')`,
        [userId]
      ),
      q(
        `SELECT COUNT(*)::int AS c FROM verifications WHERE user_id = $1 AND action = 'upvote'`,
        [userId]
      ),
      q(
        `SELECT COUNT(*)::int AS c FROM sponsorships s
         JOIN issues i ON i.id = s.issue_id
         WHERE s.sponsor_id = $1 AND i.status = 'resolved'`,
        [userId]
      ),
      q('SELECT COUNT(*)::int AS c FROM issues WHERE reported_by = $1 AND is_anonymous = true', [userId]),
      q('SELECT civic_score FROM users WHERE id = $1', [userId]),
      q(
        `SELECT rank FROM (
           SELECT id, RANK() OVER (ORDER BY civic_score DESC) AS rank FROM users WHERE role = 'citizen'
         ) r WHERE id = $1`,
        [userId]
      ),
    ]);

  return {
    total_reports: reports.rows[0].c,
    verified_reports: verifiedReports.rows[0].c,
    upvotes_given: upvotes.rows[0].c,
    sponsored_resolved: sponsoredResolved.rows[0].c,
    anonymous_reports: anonymousReports.rows[0].c,
    civic_score: score.rows[0]?.civic_score || 0,
    leaderboard_rank: rank.rows[0]?.rank ? parseInt(rank.rows[0].rank) : null,
  };
}

export async function checkAndAwardBadges(userId, client = pool) {
  const stats = await getUserStats(userId, client);
  const rules = [
    { key: 'first_reporter', label: 'First Reporter', condition: stats.total_reports >= 1 },
    { key: 'verified_citizen', label: 'Verified Citizen', condition: stats.verified_reports >= 3 },
    { key: 'community_guardian', label: 'Community Guardian', condition: stats.upvotes_given >= 25 },
    { key: 'problem_solver', label: 'Problem Solver', condition: stats.sponsored_resolved >= 1 },
    { key: 'civic_champion', label: 'Civic Champion', condition: stats.civic_score >= 500 },
    { key: 'whistleblower', label: 'Whistleblower', condition: stats.anonymous_reports >= 1 },
    { key: 'top_contributor', label: 'Top Contributor', condition: stats.leaderboard_rank === 1 },
  ];

  for (const rule of rules) {
    if (rule.condition) {
      await client.query(
        `INSERT INTO badges (user_id, badge_key, badge_label)
         VALUES ($1, $2, $3) ON CONFLICT (user_id, badge_key) DO NOTHING`,
        [userId, rule.key, rule.label]
      );
    }
  }
}

export async function getUserBadges(userId) {
  const { rows } = await pool.query(
    'SELECT badge_key, badge_label, awarded_at FROM badges WHERE user_id = $1 ORDER BY awarded_at',
    [userId]
  );
  return rows;
}
