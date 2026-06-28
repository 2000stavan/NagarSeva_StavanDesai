import pool from '../config/db.js';
import { checkAndAwardBadges } from './badges.js';

export async function awardPoints(userId, points, reason, client = pool) {
  if (!userId) return;
  await client.query('UPDATE users SET civic_score = civic_score + $1 WHERE id = $2', [points, userId]);
  await client.query(
    'INSERT INTO score_transactions (user_id, points, reason) VALUES ($1, $2, $3)',
    [userId, points, reason]
  );
  await checkAndAwardBadges(userId, client);
}

export const SCORE_RULES = {
  SUBMIT_REPORT: 10,
  REPORT_VERIFIED: 15,
  VERIFY_UPVOTE: 5,
  REPORT_RESOLVED: 25,
  SPONSOR: 20,
  RATE_RESOLUTION: 5,
  CONFIRM_DUPLICATE: 5,
};

export function getDepartmentForCategory(category) {
  const map = {
    pothole: 'Roads',
    road_damage: 'Roads',
    water_leakage: 'Water',
    streetlight: 'Electricity',
    waste: 'Waste',
    other: 'Parks',
  };
  return map[category] || 'Parks';
}

export async function findDuplicateIssue(lat, lng, category, radiusMeters = 200) {
  const { rows } = await pool.query(
    `SELECT id, title, created_at, affected_count,
            EXTRACT(DAY FROM NOW() - created_at)::int AS days_ago
     FROM issues
     WHERE category = $1
       AND status NOT IN ('resolved', 'rejected')
       AND duplicate_of IS NULL
       AND haversine_meters(latitude, longitude, $2, $3) <= $4
     ORDER BY created_at ASC
     LIMIT 1`,
    [category, lat, lng, radiusMeters]
  );
  return rows[0] || null;
}

export async function getResolutionPrediction(category, department) {
  const { rows } = await pool.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400)::numeric(10,1) AS avg_days,
            COUNT(*)::int AS count
     FROM issues
     WHERE category = $1
       AND assigned_department = $2
       AND status = 'resolved'
       AND resolved_at IS NOT NULL
       AND created_at > NOW() - INTERVAL '6 months'`,
    [category, department]
  );
  const { avg_days, count } = rows[0];
  if (!count || count < 5) {
    return { predicted_days: null, confidence: 'insufficient', based_on: count || 0 };
  }
  const days = Math.round(parseFloat(avg_days));
  const confidence = count >= 20 ? 'high' : count >= 10 ? 'medium' : 'low';
  return { predicted_days: days, confidence, based_on: count, range: `${Math.max(1, days - 1)}–${days + 1}` };
}

export function daysOpen(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}
