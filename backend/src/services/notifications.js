import pool from '../config/db.js';

export async function createNotification({ userId, type, title, body, link, issueId, jobId }) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, link, issue_id, job_id, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, type, title, body, link, issueId || null, jobId || null, body || title]
  );
}

export async function getNotifications(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY is_read ASC, created_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

export async function getUnreadCount(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return rows[0].c;
}
