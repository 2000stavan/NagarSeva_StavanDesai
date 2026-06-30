import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import pool from '../config/db.js';
import { authRequired, optionalAuth, requireRole } from '../middleware/auth.js';
import { classifyImage, verifyResolution } from '../services/ai.js';
import { uploadImage } from '../services/cloudinary.js';
import {
  awardPoints,
  SCORE_RULES,
  findDuplicateIssue,
  getDepartmentForCategory,
  getResolutionPrediction,
  daysOpen,
} from '../services/scoring.js';
import { notifyResolution } from '../services/email.js';
import { withTransaction } from '../config/db.js';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function createIssue(req, res, isAnonymous = false) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Photo required' });

    const photoUrl = await uploadImage(file.path);
    const lat = parseFloat(req.body.latitude);
    const lng = parseFloat(req.body.longitude);
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Valid latitude/longitude required' });

    const mergeWith = req.body.merge_with;
    const skipDuplicateCheck = req.body.skip_duplicate_check === 'true';

    let ai = null;
    if (req.body.category && req.body.severity) {
      ai = {
        category: req.body.category,
        severity: req.body.severity,
        title: req.body.title,
        description: req.body.description,
        estimated_cost_inr: parseFloat(req.body.estimated_cost) || 5000,
        cost_reasoning: req.body.cost_reasoning || 'User confirmed classification',
        confidence: 0.9,
      };
    } else {
      ai = await classifyImage(file.path, file.originalname);
    }

    const category = ai.category || 'other';
    const department = getDepartmentForCategory(category);

    if (mergeWith) {
      return await mergeDuplicate(req, res, mergeWith, lat, lng, isAnonymous);
    }

    if (!skipDuplicateCheck) {
      const duplicate = await findDuplicateIssue(lat, lng, category);
      if (duplicate) {
        return res.status(409).json({
          duplicate: true,
          original: duplicate,
          message: `A similar issue was reported ${duplicate.days_ago} days ago nearby.`,
        });
      }
    }

    const duplicateOf = req.body.duplicate_of || null;
    const anonymousToken = isAnonymous ? uuidv4() : null;

    const { rows } = await pool.query(
      `INSERT INTO issues (
        title, description, category, severity, photo_url, latitude, longitude,
        reported_by, is_anonymous, anonymous_token, assigned_department, estimated_cost,
        location_name, duplicate_of
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        ai.title || req.body.title || 'Community issue',
        ai.description || req.body.description || '',
        category,
        ai.severity || 'medium',
        photoUrl,
        lat,
        lng,
        isAnonymous ? null : req.user?.id,
        isAnonymous,
        anonymousToken,
        department,
        ai.estimated_cost_inr || 5000,
        req.body.location_name || null,
        duplicateOf,
      ]
    );

    const issue = rows[0];
    if (!isAnonymous && req.user) {
      await awardPoints(req.user.id, SCORE_RULES.SUBMIT_REPORT, 'Submitted a report');
    }

    const prediction = await getResolutionPrediction(category, department);
    res.status(201).json({ issue, ai, prediction, anonymous_token: anonymousToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create issue' });
  }
}

async function mergeDuplicate(req, res, originalId, lat, lng, isAnonymous) {
  await withTransaction(async (client) => {
    await client.query('UPDATE issues SET affected_count = affected_count + 1 WHERE id = $1', [originalId]);
    if (req.user && !isAnonymous) {
      await client.query(
        `INSERT INTO verifications (issue_id, user_id, action) VALUES ($1, $2, 'upvote')
         ON CONFLICT (issue_id, user_id) DO NOTHING`,
        [originalId, req.user.id]
      );
      await client.query(
        'UPDATE issues SET upvotes = (SELECT COUNT(*) FROM verifications WHERE issue_id = $1 AND action = $2) WHERE id = $1',
        [originalId, 'upvote']
      );
      await awardPoints(req.user.id, SCORE_RULES.CONFIRM_DUPLICATE, 'Confirmed duplicate issue', client);
    }
  });
  const { rows } = await pool.query('SELECT * FROM issues WHERE id = $1', [originalId]);
  res.json({ merged: true, issue: rows[0] });
}

router.post('/classify', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Photo required' });
    const ai = await classifyImage(req.file.path, req.file.originalname);
    const photoUrl = await uploadImage(req.file.path);
    res.json({ ai, photo_url: photoUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Classification failed' });
  }
});

router.post('/', authRequired, upload.single('photo'), (req, res) => createIssue(req, res, false));
router.post('/anonymous', upload.single('photo'), optionalAuth, (req, res) => createIssue(req, res, true));

router.get('/', async (req, res) => {
  try {
    const { category, status, severity, lat, lng, radius = 5000, days_open_min, days_open_max } = req.query;
    let sql = `SELECT i.*, u.name AS reporter_name,
               EXTRACT(DAY FROM NOW() - i.created_at)::int AS days_open
               FROM issues i LEFT JOIN users u ON u.id = i.reported_by WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (category) { sql += ` AND i.category = $${idx++}`; params.push(category); }
    if (status) { sql += ` AND i.status = $${idx++}`; params.push(status); }
    if (severity) { sql += ` AND i.severity = $${idx++}`; params.push(severity); }
    if (lat && lng && radius) {
      sql += ` AND haversine_meters(i.latitude, i.longitude, $${idx}, $${idx + 1}) <= $${idx + 2}`;
      params.push(parseFloat(lat), parseFloat(lng), parseFloat(radius));
      idx += 3;
    }
    sql += ' ORDER BY i.created_at DESC LIMIT 200';
    const { rows } = await pool.query(sql, params);

    let filtered = rows;
    if (days_open_min) filtered = filtered.filter((r) => r.days_open >= parseInt(days_open_min));
    if (days_open_max) filtered = filtered.filter((r) => r.days_open <= parseInt(days_open_max));

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.*, u.name AS reporter_name,
              EXTRACT(DAY FROM NOW() - i.created_at)::int AS days_open
       FROM issues i LEFT JOIN users u ON u.id = i.reported_by WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Issue not found' });

    const [escalations, sponsors, prediction, jobInfo] = await Promise.all([
      pool.query('SELECT * FROM escalation_logs WHERE issue_id = $1 ORDER BY created_at', [req.params.id]),
      pool.query(
        `SELECT s.*, u.name AS sponsor_name FROM sponsorships s
         JOIN users u ON u.id = s.sponsor_id WHERE s.issue_id = $1`,
        [req.params.id]
      ),
      getResolutionPrediction(rows[0].category, rows[0].assigned_department),
      pool.query(
        `SELECT ja.id, ja.status, ja.worker_id, u.name AS worker_first_name,
                (SELECT COUNT(*)::int FROM work_steps WHERE job_id = ja.id) AS steps_done,
                COALESCE(jsonb_array_length(ja.step_plan->'steps'), 0) AS total_steps
         FROM job_assignments ja
         LEFT JOIN users u ON u.id = ja.worker_id
         WHERE ja.issue_id = $1 ORDER BY ja.created_at DESC LIMIT 1`,
        [req.params.id]
      ),
    ]);

    const { rows: workSteps } = await pool.query(
      `SELECT ws.step_number, ws.step_label, ws.photo_url, ws.submitted_at
       FROM work_steps ws
       JOIN job_assignments ja ON ja.id = ws.job_id
       WHERE ja.issue_id = $1 ORDER BY ws.step_number`,
      [req.params.id]
    );

    res.json({
      ...rows[0],
      escalation_logs: escalations.rows,
      sponsors: sponsors.rows,
      prediction,
      job: jobInfo.rows[0] || null,
      repair_journey: workSteps.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch issue' });
  }
});

router.get('/:id/prediction', async (req, res) => {
  const { rows } = await pool.query('SELECT category, assigned_department FROM issues WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Issue not found' });
  const prediction = await getResolutionPrediction(rows[0].category, rows[0].assigned_department);
  res.json(prediction);
});

router.patch('/:id/status', authRequired, requireRole('authority', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['open', 'verified', 'in_progress', 'resolved', 'rejected', 'flagged for review'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const { rows } = await pool.query(
      'UPDATE issues SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Issue not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.post('/:id/resolve', authRequired, requireRole('authority', 'admin'), upload.single('photo'), async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM issues WHERE id = $1', [req.params.id]);
    const issue = existing[0];
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    if (!req.file) return res.status(400).json({ error: 'Resolved photo required' });

    const resolvedUrl = await uploadImage(req.file.path);
    const verification = await verifyResolution(issue.photo_url, req.file.path);

    if (!verification.is_resolved && verification.confidence > 0.7) {
      return res.status(422).json({ error: 'AI could not confirm resolution', verification });
    }

    const { rows } = await pool.query(
      `UPDATE issues SET status = 'resolved', resolved_photo_url = $1, resolved_at = NOW() WHERE id = $2 RETURNING *`,
      [resolvedUrl, req.params.id]
    );

    if (issue.reported_by) {
      await awardPoints(issue.reported_by, SCORE_RULES.REPORT_RESOLVED, 'Report resolved');
      await notifyResolution(issue.reported_by, rows[0]);

      const { rows: verifiers } = await pool.query(
        `SELECT user_id FROM verifications WHERE issue_id = $1 AND action = 'upvote'`,
        [req.params.id]
      );
      for (const v of verifiers) {
        await awardPoints(v.user_id, SCORE_RULES.VERIFY_UPVOTE, 'Verified issue resolved');
      }
    }

    res.json({ issue: rows[0], verification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resolve issue' });
  }
});

router.post('/:id/verify', authRequired, async (req, res) => {
  try {
    const { action } = req.body;
    if (!['upvote', 'flag'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    await pool.query(
      `INSERT INTO verifications (issue_id, user_id, action) VALUES ($1, $2, $3)
       ON CONFLICT (issue_id, user_id) DO UPDATE SET action = $3`,
      [req.params.id, req.user.id, action]
    );

    const { rows: counts } = await pool.query(
      `SELECT
         SUM(CASE WHEN action = 'upvote' THEN 1 ELSE 0 END)::int AS upvotes,
         SUM(CASE WHEN action = 'flag' THEN 1 ELSE 0 END)::int AS flags
       FROM verifications WHERE issue_id = $1`,
      [req.params.id]
    );
    const { upvotes, flags } = counts[0];

    await pool.query('UPDATE issues SET upvotes = $1, flags = $2 WHERE id = $3', [upvotes, flags, req.params.id]);

    let newStatus = null;
    if (upvotes >= 3) newStatus = 'verified';
    if (flags >= 3) newStatus = 'flagged for review';

    if (newStatus) {
      await pool.query('UPDATE issues SET status = $1 WHERE id = $2', [newStatus, req.params.id]);
      if (newStatus === 'verified') {
        const { rows: issue } = await pool.query('SELECT reported_by FROM issues WHERE id = $1', [req.params.id]);
        if (issue[0]?.reported_by) {
          await awardPoints(issue[0].reported_by, SCORE_RULES.REPORT_VERIFIED, 'Report verified by community');
        }
      }
    }

    await awardPoints(req.user.id, SCORE_RULES.VERIFY_UPVOTE, `${action} on issue`);

    const { rows } = await pool.query('SELECT * FROM issues WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/:id/sponsor', authRequired, async (req, res) => {
  try {
    const { amount, message } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    await pool.query(
      'INSERT INTO sponsorships (issue_id, sponsor_id, amount, message) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, amount, message || null]
    );
    await pool.query(
      'UPDATE issues SET sponsored_amount = sponsored_amount + $1 WHERE id = $2',
      [amount, req.params.id]
    );
    await awardPoints(req.user.id, SCORE_RULES.SPONSOR, 'Sponsored an issue');

    const { rows } = await pool.query('SELECT * FROM issues WHERE id = $1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sponsorship failed' });
  }
});

router.get('/:id/sponsors', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, u.name AS sponsor_name FROM sponsorships s
     JOIN users u ON u.id = s.sponsor_id WHERE s.issue_id = $1 ORDER BY s.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/satisfaction', authRequired, async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });

    const { rows: issue } = await pool.query('SELECT * FROM issues WHERE id = $1 AND status = $2', [
      req.params.id,
      'resolved',
    ]);
    if (!issue[0]) return res.status(400).json({ error: 'Issue must be resolved' });

    await pool.query(
      `INSERT INTO satisfaction_ratings (issue_id, user_id, rating) VALUES ($1, $2, $3)
       ON CONFLICT (issue_id, user_id) DO UPDATE SET rating = $3`,
      [req.params.id, req.user.id, rating]
    );
    await awardPoints(req.user.id, SCORE_RULES.RATE_RESOLUTION, 'Rated resolution');

    res.json({ success: true, rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

export default router;
