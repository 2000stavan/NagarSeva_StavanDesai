import cron from 'node-cron';
import pool from '../config/db.js';
import { sendEscalationEmail } from '../services/email.js';
import { daysOpen } from '../services/scoring.js';

const DEPARTMENT_HEADS = {
  Roads: 'roads.head@mumbai.gov.in',
  Water: 'water.head@mumbai.gov.in',
  Electricity: 'electricity.head@mumbai.gov.in',
  Waste: 'waste.head@mumbai.gov.in',
  Parks: 'parks.head@mumbai.gov.in',
};

async function escalateIssues() {
  console.log('[Cron] Running escalation check...');
  const { rows: issues } = await pool.query(
    `SELECT i.*, u.email AS reporter_email
     FROM issues i
     LEFT JOIN users u ON u.id = i.reported_by
     WHERE i.status NOT IN ('resolved', 'rejected')`
  );

  for (const issue of issues) {
    const days = daysOpen(issue.created_at);
    const link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/issues/${issue.id}`;

    if (days >= 7 && issue.escalation_level < 1 && issue.status === 'open') {
      const head = DEPARTMENT_HEADS[issue.assigned_department] || 'admin@mumbai.gov.in';
      await sendEscalationEmail(
        head,
        `[Level 1] Escalated: ${issue.title}`,
        `<p>Issue open for ${days} days in ${issue.assigned_department} department.</p><p><a href="${link}">View issue</a></p>`
      );
      await pool.query('UPDATE issues SET escalation_level = 1 WHERE id = $1', [issue.id]);
      await pool.query(
        'INSERT INTO escalation_logs (issue_id, escalation_level, notified_to, reason) VALUES ($1, 1, $2, $3)',
        [issue.id, head, `Open for ${days} days`]
      );
    }

    if ((days >= 21 || issue.upvotes >= 50) && issue.escalation_level < 2) {
      const { rows: ngos } = await pool.query(
        `SELECT email, name FROM users WHERE role IN ('ngo', 'journalist')
         AND latitude IS NOT NULL AND longitude IS NOT NULL
         AND haversine_meters(latitude, longitude, $1, $2) <= 10000`,
        [issue.latitude, issue.longitude]
      );

      for (const ngo of ngos) {
        await sendEscalationEmail(
          ngo.email,
          `[Level 2] Unresolved issue in your area: ${issue.title}`,
          `<p>Issue unresolved for ${days}+ days at ${issue.location_name || 'nearby'}.</p><p><a href="${link}">View issue</a></p>`
        );
      }

      await pool.query('UPDATE issues SET escalation_level = 2 WHERE id = $1', [issue.id]);
      await pool.query(
        'INSERT INTO escalation_logs (issue_id, escalation_level, notified_to, reason) VALUES ($1, 2, $2, $3)',
        [issue.id, ngos.map((n) => n.email).join(', ') || 'NGO list', `${days} days open or 50+ upvotes`]
      );
    }

    if (days >= 45 && issue.escalation_level < 3) {
      await sendEscalationEmail(
        'commissioner@mumbai.gov.in',
        `[Level 3] Critical: ${issue.title}`,
        `<p>Issue open for ${days} days — flagged for municipal commissioner.</p><p><a href="${link}">View issue</a></p>`
      );
      await pool.query(
        'UPDATE issues SET escalation_level = 3, severity = $1 WHERE id = $2',
        ['critical', issue.id]
      );
      await pool.query(
        'INSERT INTO escalation_logs (issue_id, escalation_level, notified_to, reason) VALUES ($1, 3, $2, $3)',
        [issue.id, 'commissioner@mumbai.gov.in', `${days} days open`]
      );
    }
  }
}

export function startEscalationCron() {
  cron.schedule('0 8 * * *', escalateIssues);
  console.log('[Cron] Escalation job scheduled (daily 8 AM)');
}

export { escalateIssues };
