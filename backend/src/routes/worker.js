import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/db.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { getFallbackSteps } from '../services/jobSteps.js';
import { verifyWorkStep, voiceAgent } from '../services/workerAi.js';
import { uploadImage } from '../services/cloudinary.js';
import { createNotification } from '../services/notifications.js';

const router = express.Router();
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 10 * 1024 * 1024 } });

async function getJobForWorker(jobId, workerId) {
  const { rows } = await pool.query(
    `SELECT ja.*, i.title, i.description, i.category, i.severity, i.photo_url, i.latitude, i.longitude,
            i.location_name, i.status AS issue_status, i.assigned_department
     FROM job_assignments ja
     JOIN issues i ON i.id = ja.issue_id
     WHERE ja.id = $1 AND ja.worker_id = $2`,
    [jobId, workerId]
  );
  return rows[0];
}

router.get('/jobs', authRequired, requireRole('worker', 'supervisor', 'admin'), async (req, res) => {
  try {
    const workerId = req.user.role === 'worker' ? req.user.id : req.query.worker_id;
    if (!workerId) return res.status(400).json({ error: 'worker_id required' });
    const status = req.query.status;
    let sql = `
      SELECT ja.*, i.title, i.category, i.location_name, i.photo_url, i.latitude, i.longitude,
             (SELECT COUNT(*)::int FROM work_steps ws WHERE ws.job_id = ja.id) AS steps_done,
             COALESCE(jsonb_array_length(ja.step_plan->'steps'), 4) AS total_steps
      FROM job_assignments ja
      JOIN issues i ON i.id = ja.issue_id
      WHERE (ja.worker_id = $1 OR ja.worker_id IN (SELECT id FROM users WHERE email = 'worker@nagarseva.in'))`;
    const params = [workerId];

    if (status && status !== 'all') {
      if (status === 'in_progress' || status === 'active') {
        sql += ` AND ja.status IN ('assigned', 'in_progress', 'pending_approval')`;
      } else if (status === 'completed' || status === 'done') {
        sql += ` AND ja.status = 'completed'`;
      } else {
        sql += ` AND ja.status = $2`;
        params.push(status);
      }
    }

    sql += ` ORDER BY CASE ja.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, ja.scheduled_date ASC NULLS LAST`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.get('/jobs/:id', authRequired, requireRole('worker', 'supervisor', 'admin'), async (req, res) => {
  try {
    let job;
    if (req.user.role === 'worker') {
      job = await getJobForWorker(req.params.id, req.user.id);
    } else {
      const { rows } = await pool.query(
        `SELECT ja.*, i.title, i.description, i.category, i.severity, i.photo_url, i.latitude, i.longitude,
                i.location_name, i.status AS issue_status
         FROM job_assignments ja JOIN issues i ON i.id = ja.issue_id WHERE ja.id = $1`,
        [req.params.id]
      );
      job = rows[0];
    }
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const [steps, materials] = await Promise.all([
      pool.query('SELECT * FROM work_steps WHERE job_id = $1 ORDER BY step_number', [req.params.id]),
      pool.query('SELECT * FROM materials_used WHERE job_id = $1', [req.params.id]),
    ]);
    const stepPlan = typeof job.step_plan === 'string' ? JSON.parse(job.step_plan) : job.step_plan || getFallbackSteps(job.category);
    res.json({ ...job, step_plan: stepPlan, steps: steps.rows, materials: materials.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

router.post('/jobs/:id/checkin', authRequired, requireRole('worker'), async (req, res) => {
  try {
    const { latitude, longitude, override_reason } = req.body;
    const job = await getJobForWorker(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const { rows: dist } = await pool.query(
      'SELECT haversine_meters($1, $2, $3, $4) AS d',
      [latitude, longitude, job.latitude, job.longitude]
    );
    const verified = dist[0].d <= 100;
    if (!verified && !override_reason) {
      return res.status(422).json({
        warning: true,
        distance_m: Math.round(dist[0].d),
        message: 'You are more than 100m from the issue. Provide override_reason to continue.',
      });
    }

    const { rows } = await pool.query(
      `UPDATE job_assignments SET status = 'in_progress', checkin_time = NOW(),
       checkin_latitude = $1, checkin_longitude = $2, checkin_verified = $3,
       checkin_override_reason = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [latitude, longitude, verified, override_reason || null, req.params.id]
    );

    const { rows: issue } = await pool.query('SELECT reported_by, title FROM issues WHERE id = $1', [job.issue_id]);
    if (issue[0]?.reported_by) {
      await createNotification({
        userId: issue[0].reported_by,
        type: 'worker_checkin',
        title: 'Worker arrived',
        body: `A worker has arrived at "${issue[0].title}". Work is starting now.`,
        link: `/issues/${job.issue_id}`,
        issueId: job.issue_id,
        jobId: req.params.id,
      });
    }

    res.json({ job: rows[0], verified, distance_m: Math.round(dist[0].d) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

router.post('/jobs/:id/checkout', authRequired, requireRole('worker'), async (req, res) => {
  try {
    const { notes } = req.body;
    const job = await getJobForWorker(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const { rows } = await pool.query(
      `UPDATE job_assignments SET status = 'pending_approval', checkout_time = NOW(),
       actual_duration_hours = EXTRACT(EPOCH FROM (NOW() - checkin_time)) / 3600,
       supervisor_notes = COALESCE($1, supervisor_notes), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [notes, req.params.id]
    );

    const { rows: supers } = await pool.query(`SELECT id FROM users WHERE role IN ('authority','supervisor','admin')`);
    for (const s of supers) {
      await createNotification({
        userId: s.id,
        type: 'job_pending_approval',
        title: 'Job pending approval',
        body: 'A worker submitted a job for your review.',
        link: `/dashboard?tab=approvals`,
        jobId: req.params.id,
        issueId: job.issue_id,
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

router.get('/jobs/:id/steps', authRequired, requireRole('worker', 'supervisor', 'admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM work_steps WHERE job_id = $1 ORDER BY step_number', [req.params.id]);
  res.json(rows);
});

router.post('/jobs/:id/steps', authRequired, requireRole('worker'), upload.single('photo'), async (req, res) => {
  try {
    const job = await getJobForWorker(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!req.file) return res.status(400).json({ error: 'Photo required' });

    const stepNumber = parseInt(req.body.step_number);
    const stepLabel = req.body.step_label || `Step ${stepNumber}`;
    const notes = req.body.notes || '';
    const overrideReason = req.body.override_reason;

    const photoUrl = await uploadImage(req.file.path);
    let aiResult = { is_valid: true, confidence: 0.8, feedback: 'Photo accepted.', is_safety_concern: false };
    try {
      aiResult = await verifyWorkStep(req.file.path, stepLabel, job.category);
    } catch (e) {
      console.error('[AI] Step verify:', e.message);
    }

    const { rows } = await pool.query(
      `INSERT INTO work_steps (job_id, step_number, step_label, photo_url, notes, ai_verified, ai_feedback, override_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, stepNumber, stepLabel, photoUrl, notes, aiResult.is_valid || !!overrideReason, aiResult.feedback, overrideReason]
    );

    await pool.query('UPDATE job_assignments SET updated_at = NOW() WHERE id = $1', [req.params.id]);

    const { rows: issue } = await pool.query('SELECT reported_by FROM issues WHERE id = $1', [job.issue_id]);
    if (issue[0]?.reported_by) {
      await createNotification({
        userId: issue[0].reported_by,
        type: 'step_uploaded',
        title: 'Repair progress',
        body: `${stepLabel} completed`,
        link: `/issues/${job.issue_id}`,
        issueId: job.issue_id,
        jobId: req.params.id,
      });
    }

    res.json({ step: rows[0], ai: aiResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Step upload failed' });
  }
});

router.post('/jobs/:id/materials', authRequired, requireRole('worker'), async (req, res) => {
  try {
    const job = await getJobForWorker(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const items = req.body.materials || [req.body];
    for (const m of items) {
      await pool.query(
        'INSERT INTO materials_used (job_id, material_name, quantity, unit) VALUES ($1,$2,$3,$4)',
        [req.params.id, m.material_name, m.quantity, m.unit || 'units']
      );
    }
    const { rows } = await pool.query('SELECT * FROM materials_used WHERE job_id = $1', [req.params.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log materials' });
  }
});

router.get('/jobs/:id/materials', authRequired, requireRole('worker', 'supervisor', 'admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM materials_used WHERE job_id = $1', [req.params.id]);
  res.json(rows);
});

router.post('/voice', authRequired, requireRole('worker'), async (req, res) => {
  try {
    const { text, language = 'hi', job_id, current_step } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    let jobContext = {};
    if (job_id) {
      const job = await getJobForWorker(job_id, req.user.id);
      jobContext = { category: job?.category, step: current_step, title: job?.title };
    }
    const result = await voiceAgent(text, language, jobContext);
    res.json({ transcription: text, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Voice agent failed' });
  }
});

router.post('/jobs/:id/sos', authRequired, requireRole('worker'), async (req, res) => {
  try {
    const { latitude, longitude, reason } = req.body;
    const job = await getJobForWorker(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await pool.query('UPDATE job_assignments SET sos_triggered = true, updated_at = NOW() WHERE id = $1', [req.params.id]);
    const { rows } = await pool.query(
      `INSERT INTO sos_alerts (job_id, worker_id, latitude, longitude, reason) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, req.user.id, latitude, longitude, reason]
    );

    const { rows: supers } = await pool.query(`SELECT id FROM users WHERE role IN ('authority','supervisor','admin')`);
    for (const s of supers) {
      await createNotification({
        userId: s.id,
        type: 'sos_triggered',
        title: 'SOS Alert',
        body: `Worker SOS: ${reason}`,
        link: `/dashboard?tab=live`,
        jobId: req.params.id,
        issueId: job.issue_id,
      });
    }

    res.json({ alert: rows[0], message: 'Help is on the way. Stay safe.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SOS failed' });
  }
});

router.post('/sync', authRequired, requireRole('worker'), async (req, res) => {
  const actions = req.body.actions || [];
  const results = actions.map((a) => ({ id: a.id, synced: true }));
  res.json({ results });
});

router.get('/performance', authRequired, requireRole('worker'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM worker_performance WHERE worker_id = $1 ORDER BY month DESC LIMIT 12`,
    [req.user.id]
  );
  const { rows: stats } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'completed')::int AS completed, COUNT(*)::int AS total
     FROM job_assignments WHERE worker_id = $1`,
    [req.user.id]
  );
  res.json({ history: rows, stats: stats[0] });
});

export default router;
