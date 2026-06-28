import { Router } from 'express';
import pool from '../config/db.js';
import { daysOpen } from '../services/scoring.js';

const router = Router();

router.get('/issues', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, category, severity, status, latitude, longitude,
              upvotes, affected_count, created_at,
              EXTRACT(DAY FROM NOW() - created_at)::int AS days_open
       FROM issues
       WHERE status NOT IN ('resolved', 'rejected')
       AND latitude IS NOT NULL`
    );

    const features = rows.map((issue) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [issue.longitude, issue.latitude] },
      properties: {
        id: issue.id,
        title: issue.title,
        category: issue.category,
        severity: issue.severity,
        status: issue.status,
        upvotes: issue.upvotes,
        affected_count: issue.affected_count,
        days_open: issue.days_open,
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

router.get('/heatmap', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT latitude, longitude,
              EXTRACT(DAY FROM NOW() - created_at)::int AS days_open,
              severity, category
       FROM issues
       WHERE status NOT IN ('resolved', 'rejected')
       AND latitude IS NOT NULL`
    );

    const points = rows.map((r) => {
      const days = r.days_open;
      let intensity;
      if (days <= 7) intensity = 0.25;
      else if (days <= 30) intensity = 0.5;
      else if (days <= 90) intensity = 0.75;
      else intensity = 1.0;

      return [r.latitude, r.longitude, intensity];
    });

    res.json({ points, issues: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

router.get('/clusters', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, category, severity, latitude, longitude,
              affected_count, upvotes, status,
              EXTRACT(DAY FROM NOW() - created_at)::int AS days_open
       FROM issues
       WHERE duplicate_of IS NULL
       AND status NOT IN ('resolved', 'rejected')
       AND latitude IS NOT NULL
       ORDER BY affected_count DESC`
    );

    const clusters = rows.map((r) => ({
      id: r.id,
      lat: r.latitude,
      lng: r.longitude,
      count: r.affected_count,
      title: r.title,
      category: r.category,
      severity: r.severity,
      days_open: r.days_open,
    }));

    res.json(clusters);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

export default router;
