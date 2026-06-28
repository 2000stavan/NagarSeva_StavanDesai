import cron from 'node-cron';
import pool from '../config/db.js';
import { generateDailySummary } from '../services/workerAi.js';
import { calculatePerformanceScore } from '../services/jobSteps.js';

export function startWorkerCron() {
  cron.schedule('0 18 * * *', async () => {
    console.log('[Cron] Generating worker daily summaries...');
    try {
      const { rows: workers } = await pool.query(
        `SELECT DISTINCT ja.worker_id, u.name FROM job_assignments ja
         JOIN users u ON u.id = ja.worker_id
         WHERE DATE(ja.updated_at) = CURRENT_DATE`
      );
      for (const w of workers) {
        const { rows: jobs } = await pool.query(
          `SELECT status FROM job_assignments WHERE worker_id = $1 AND DATE(updated_at) = CURRENT_DATE`,
          [w.worker_id]
        );
        const jobsData = {
          completed: jobs.filter((j) => j.status === 'completed').length,
          in_progress: jobs.filter((j) => j.status === 'in_progress').length,
          total: jobs.length,
        };
        const summary = await generateDailySummary(w.name, jobsData);
        await pool.query(
          `INSERT INTO daily_summaries (worker_id, summary_date, jobs_completed, jobs_in_progress, summary_text, summary_json)
           VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
           ON CONFLICT (worker_id, summary_date) DO UPDATE SET summary_text = EXCLUDED.summary_text, summary_json = EXCLUDED.summary_json`,
          [w.worker_id, jobsData.completed, jobsData.in_progress, summary.summary, JSON.stringify(summary)]
        );
      }
    } catch (err) {
      console.error('[Cron] Daily summary failed:', err.message);
    }
  });

  cron.schedule('0 0 1 * *', async () => {
    console.log('[Cron] Recalculating worker performance...');
    try {
      const { rows: workers } = await pool.query(`SELECT id FROM users WHERE role = 'worker'`);
      for (const w of workers) {
        const { rows: m } = await pool.query(
          `SELECT COUNT(*)::int AS assigned,
                  COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                  AVG(actual_duration_hours) AS avg_hours,
                  AVG(estimated_duration_hours) AS est_hours
           FROM job_assignments WHERE worker_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`,
          [w.id]
        );
        const { rows: sos } = await pool.query(
          `SELECT COUNT(*)::int AS c FROM sos_alerts WHERE worker_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`,
          [w.id]
        );
        const metrics = { ...m[0], sos_count: sos[0].c, citizen_satisfaction_avg: 4 };
        const score = calculatePerformanceScore(metrics);
        await pool.query(
          `INSERT INTO worker_performance (worker_id, month, jobs_assigned, jobs_completed, avg_completion_hours, sos_count, performance_score)
           VALUES ($1, DATE_TRUNC('month', NOW())::date, $2, $3, $4, $5, $6)
           ON CONFLICT (worker_id, month) DO UPDATE SET performance_score = EXCLUDED.performance_score`,
          [w.id, m[0].assigned, m[0].completed, m[0].avg_hours, sos[0].c, score]
        );
      }
    } catch (err) {
      console.error('[Cron] Performance calc failed:', err.message);
    }
  });

  console.log('[Cron] Worker jobs scheduled');
}
