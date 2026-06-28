import express from 'express';
import pool from '../config/db.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { generateJobSteps } from '../services/workerAi.js';
import { createNotification } from '../services/notifications.js';
import { awardPoints, SCORE_RULES } from '../services/scoring.js';
import QRCode from 'qrcode';

const router = express.Router();

router.get('/workers', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  try {
    const dept = req.user.department;
    let sql = `
      SELECT u.id, u.name, u.email, u.department,
             (SELECT COUNT(*)::int FROM job_assignments WHERE worker_id = u.id AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) AS jobs_assigned,
             (SELECT COUNT(*)::int FROM job_assignments WHERE worker_id = u.id AND status = 'completed' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) AS jobs_completed,
             (SELECT status FROM job_assignments WHERE worker_id = u.id AND status IN ('in_progress','checked_in') ORDER BY updated_at DESC LIMIT 1) AS current_status,
             (SELECT performance_score FROM worker_performance WHERE worker_id = u.id ORDER BY month DESC LIMIT 1) AS performance_score
      FROM users u WHERE u.role = 'worker'`;
    const params = [];
    if (dept && req.user.role !== 'admin') { sql += ` AND u.department = $1`; params.push(dept); }
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

router.post('/assign', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { issue_id, worker_id, scheduled_date, priority = 'normal', estimated_duration_hours, generate_qr = true } = req.body;
    const { rows: issue } = await pool.query('SELECT * FROM issues WHERE id = $1', [issue_id]);
    if (!issue[0]) return res.status(404).json({ error: 'Issue not found' });

    const stepPlan = await generateJobSteps(issue[0].category, issue[0].description, issue[0].severity);
    let qrUrl = null;
    if (generate_qr) {
      const qrData = await QRCode.toDataURL(JSON.stringify({ issue_id, lat: issue[0].latitude, lng: issue[0].longitude }));
      qrUrl = qrData;
    }

    const { rows } = await pool.query(
      `INSERT INTO job_assignments (issue_id, worker_id, assigned_by, scheduled_date, priority, estimated_duration_hours, step_plan, qr_code_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'assigned') RETURNING *`,
      [issue_id, worker_id, req.user.id, scheduled_date, priority, estimated_duration_hours || stepPlan.total_estimated_hours, JSON.stringify(stepPlan), qrUrl]
    );

    await pool.query(`UPDATE issues SET status = 'in_progress', assigned_department = COALESCE(assigned_department, (SELECT department FROM users WHERE id = $2)) WHERE id = $1`, [issue_id, worker_id]);

    await createNotification({
      userId: worker_id,
      type: 'job_assigned',
      title: 'New job assigned',
      body: `You have been assigned: ${issue[0].title}`,
      link: `/worker/jobs/${rows[0].id}`,
      issueId: issue_id,
      jobId: rows[0].id,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Assignment failed' });
  }
});

router.get('/pending', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ja.*, i.title, i.category, i.photo_url, i.location_name, u.name AS worker_name,
            (SELECT COUNT(*)::int FROM work_steps WHERE job_id = ja.id) AS step_count
     FROM job_assignments ja
     JOIN issues i ON i.id = ja.issue_id
     JOIN users u ON u.id = ja.worker_id
     WHERE ja.status = 'pending_approval'
     ORDER BY ja.checkout_time DESC`
  );
  res.json(rows);
});

router.get('/live', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  const dept = req.user.department;
  let sql = `
    SELECT ja.*, i.title, i.location_name, i.category, u.name AS worker_name,
           (SELECT COUNT(*)::int FROM work_steps WHERE job_id = ja.id) AS steps_done,
           (SELECT photo_url FROM work_steps WHERE job_id = ja.id ORDER BY step_number DESC LIMIT 1) AS last_photo
    FROM job_assignments ja
    JOIN issues i ON i.id = ja.issue_id
    JOIN users u ON u.id = ja.worker_id
    WHERE ja.status IN ('in_progress','checked_in')`;
  const params = [];
  if (dept && req.user.role !== 'admin') {
    sql += ` AND u.department = $1`;
    params.push(dept);
  }
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

router.get('/sos', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, u.name AS worker_name, i.title, i.location_name, ja.id AS job_id
     FROM sos_alerts s
     JOIN users u ON u.id = s.worker_id
     JOIN job_assignments ja ON ja.id = s.job_id
     JOIN issues i ON i.id = ja.issue_id
     WHERE s.resolved = false ORDER BY s.created_at DESC`
  );
  res.json(rows);
});

router.get('/jobs/:id/review', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ja.*, i.title, i.description, i.photo_url, i.category, u.name AS worker_name
     FROM job_assignments ja JOIN issues i ON i.id = ja.issue_id JOIN users u ON u.id = ja.worker_id
     WHERE ja.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  const [steps, materials] = await Promise.all([
    pool.query('SELECT * FROM work_steps WHERE job_id = $1 ORDER BY step_number', [req.params.id]),
    pool.query('SELECT * FROM materials_used WHERE job_id = $1', [req.params.id]),
  ]);
  res.json({ ...rows[0], steps: steps.rows, materials: materials.rows });
});

router.post('/jobs/:id/approve', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { rows: job } = await pool.query(
      `SELECT ja.*, i.reported_by, i.title FROM job_assignments ja JOIN issues i ON i.id = ja.issue_id WHERE ja.id = $1`,
      [req.params.id]
    );
    if (!job[0]) return res.status(404).json({ error: 'Job not found' });

    const { rows: lastStep } = await pool.query(
      'SELECT photo_url FROM work_steps WHERE job_id = $1 ORDER BY step_number DESC LIMIT 1',
      [req.params.id]
    );
    const resolvedPhoto = lastStep[0]?.photo_url;

    await pool.query(
      `UPDATE job_assignments SET status = 'completed', supervisor_approved = true, supervisor_id = $1, completed_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [req.user.id, req.params.id]
    );

    await pool.query(
      `UPDATE issues SET status = 'resolved', resolved_photo_url = $1, resolved_at = NOW() WHERE id = $2`,
      [resolvedPhoto, job[0].issue_id]
    );

    if (job[0].reported_by) {
      await awardPoints(job[0].reported_by, SCORE_RULES.REPORT_RESOLVED, 'Report resolved');
      await createNotification({
        userId: job[0].reported_by,
        type: 'issue_resolved',
        title: 'Issue resolved!',
        body: `Your reported issue "${job[0].title}" has been resolved!`,
        link: `/issues/${job[0].issue_id}`,
        issueId: job[0].issue_id,
        jobId: req.params.id,
      });
      await createNotification({
        userId: job[0].reported_by,
        type: 'satisfaction_request',
        title: 'Rate this resolution',
        body: 'How would you rate the repair?',
        link: `/issues/${job[0].issue_id}`,
        issueId: job[0].issue_id,
      });
    }

    await createNotification({
      userId: job[0].worker_id,
      type: 'job_approved',
      title: 'Job approved',
      body: 'Your work has been approved. Great job!',
      link: `/worker/jobs/${req.params.id}`,
      jobId: req.params.id,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Approval failed' });
  }
});

router.post('/jobs/:id/reject', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    const { rows } = await pool.query(
      `UPDATE job_assignments SET status = 'in_progress', supervisor_notes = $1, supervisor_approved = false, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [notes, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    await createNotification({
      userId: rows[0].worker_id,
      type: 'job_rejected',
      title: 'Job needs rework',
      body: notes || 'Please redo some steps.',
      link: `/worker/jobs/${req.params.id}/active`,
      jobId: req.params.id,
    });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Reject failed' });
  }
});

router.patch('/sos/:id/resolve', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  const { notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE sos_alerts SET resolved = true, resolved_by = $1, resolution_notes = $2 WHERE id = $3 RETURNING *`,
    [req.user.id, notes, req.params.id]
  );
  if (rows[0]) {
    await pool.query('UPDATE job_assignments SET sos_triggered = false WHERE id = $1', [rows[0].job_id]);
  }
  res.json(rows[0]);
});

router.get('/performance', authRequired, requireRole('authority', 'supervisor', 'admin'), async (req, res) => {
  const dept = req.user.department;
  let sql = `SELECT wp.*, u.name FROM worker_performance wp JOIN users u ON u.id = wp.worker_id WHERE 1=1`;
  const params = [];
  if (dept && req.user.role !== 'admin') { sql += ` AND u.department = $1`; params.push(dept); }
  sql += ` ORDER BY wp.performance_score DESC NULLS LAST`;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

export default router;
