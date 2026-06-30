import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function autoInitDatabase() {
  try {
    const check = await pool.query(`SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    );`);

    const tableExists = check.rows[0].exists;
    if (!tableExists) {
      console.log('Automated Deployment: Initializing tables and schema...');
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await pool.query(schemaSql);

      const workerSchemaSql = fs.readFileSync(path.join(__dirname, 'worker-schema.sql'), 'utf8');
      await pool.query(workerSchemaSql);
    }

    console.log('Automated Deployment: Ensuring demo accounts exist with password123...');
    const hash = await bcrypt.hash('password123', 10);
    
    // Always upsert Demo Accounts so login guaranteed to work
    await pool.query(`
      INSERT INTO users (email, password_hash, name, role, department, civic_score)
      VALUES 
        ('demo@communityhero.in', $1, 'Priya Sharma', 'citizen', NULL, 120),
        ('roads@mumbai.gov.in', $1, 'Rajesh Gupta', 'authority', 'Roads', 0),
        ('worker.roads1@nagarseva.in', $1, 'Suresh Kumar', 'worker', 'Roads', 0),
        ('supervisor@mumbai.gov.in', $1, 'Amit Verma', 'supervisor', 'Roads', 0),
        ('admin@mumbai.gov.in', $1, 'NagarSeva Admin', 'admin', 'Roads', 0)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [hash]);

    return { initialized: true, message: 'Verified tables and ensured all demo accounts have password123.' };
  } catch (err) {
    console.error('Auto initialization error:', err.message);
    return { initialized: false, error: err.message };
  }
}

export async function seedDemoDashboardData() {
  try {
    await autoInitDatabase();

    const citizenRes = await pool.query(`SELECT id FROM users WHERE email = 'demo@communityhero.in'`);
    const workerRes = await pool.query(`SELECT id FROM users WHERE email = 'worker.roads1@nagarseva.in'`);
    const authorityRes = await pool.query(`SELECT id FROM users WHERE email = 'roads@mumbai.gov.in'`);

    const citizenId = citizenRes.rows[0]?.id;
    const workerId = workerRes.rows[0]?.id;
    const authorityId = authorityRes.rows[0]?.id;

    if (!citizenId || !workerId) {
      throw new Error('Demo users could not be found or created.');
    }

    // Check existing issues reported by demo citizen
    const existingIssues = await pool.query(`SELECT COUNT(*) FROM issues WHERE reported_by = $1`, [citizenId]);
    if (parseInt(existingIssues.rows[0].count, 10) < 5) {
      const demoIssues = [
        {
          title: 'Dangerous Pothole on JVLR Flyover',
          description: 'Large 3-foot crater on left lane causing severe two-wheeler skidding risk.',
          category: 'pothole', severity: 'critical', status: 'in_progress',
          photo_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
          lat: 19.117, lng: 72.882, loc: 'Jogeshwari-Vikhroli Link Road, Powai'
        },
        {
          title: 'Massive Water Pipe Leak outside Dadar Station',
          description: 'High pressure drinking water main rupture flooding the sidewalk.',
          category: 'water_leakage', severity: 'high', status: 'verified',
          photo_url: 'https://images.unsplash.com/photo-1542013936693-8c463f88e0b0?auto=format&fit=crop&w=800&q=80',
          lat: 19.018, lng: 72.843, loc: 'Dadar West Railway Station Entrance'
        },
        {
          title: 'Entire Streetlight Row Dead near Shivaji Park',
          description: 'Pitch dark walking path along perimeter after recent monsoon rains.',
          category: 'streetlight', severity: 'medium', status: 'open',
          photo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
          lat: 19.026, lng: 72.838, loc: 'Shivaji Park Perimeter Road, Dadar'
        },
        {
          title: 'Overflowing Municipal Waste Dumpster',
          description: 'Uncollected organic and solid waste blocking pedestrian footwalk.',
          category: 'waste', severity: 'medium', status: 'verified',
          photo_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
          lat: 19.058, lng: 72.830, loc: 'Linking Road Junction, Bandra West'
        },
        {
          title: 'Deep Road Subsidence outside Kurla Terminal',
          description: 'Asphalt sinking near bus depot causing bottleneck.',
          category: 'road_damage', severity: 'high', status: 'resolved',
          photo_url: 'https://images.unsplash.com/photo-1584463623578-3b3b44b82fc6?auto=format&fit=crop&w=800&q=80',
          lat: 19.066, lng: 72.888, loc: 'Kurla East Bus Depot'
        },
        {
          title: 'Fallen Tree Branch Damaging Footpath Fence',
          description: 'Heavy branch obstructing morning walkers trail.',
          category: 'other', severity: 'low', status: 'open',
          photo_url: 'https://images.unsplash.com/photo-1541888946425-d0ebb18086f6?auto=format&fit=crop&w=800&q=80',
          lat: 19.034, lng: 72.855, loc: 'Five Gardens, Matunga East'
        }
      ];

      for (const iss of demoIssues) {
        await pool.query(`
          INSERT INTO issues (title, description, category, severity, status, photo_url, latitude, longitude, location_name, reported_by, upvotes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [iss.title, iss.description, iss.category, iss.severity, iss.status, iss.photo_url, iss.lat, iss.lng, iss.loc, citizenId, Math.floor(Math.random() * 25) + 5]);
      }
    }

    // Check existing worker jobs assigned to Suresh Kumar
    const existingJobs = await pool.query(`SELECT COUNT(*) FROM job_assignments WHERE worker_id = $1`, [workerId]);
    if (parseInt(existingJobs.rows[0].count, 10) < 4) {
      // Fetch issues to attach jobs to
      const issuesRes = await pool.query(`SELECT id, title, category FROM issues LIMIT 6`);
      const issues = issuesRes.rows;

      const { getFallbackSteps } = await import('../services/jobSteps.js');

      const jobSpecs = [
        { status: 'in_progress', priority: 'urgent', sched: 'Today', checkin: true },
        { status: 'assigned', priority: 'normal', sched: 'Tomorrow', checkin: false },
        { status: 'pending_approval', priority: 'urgent', sched: 'Yesterday', checkin: true },
        { status: 'completed', priority: 'normal', sched: '3 days ago', checkin: true },
        { status: 'assigned', priority: 'urgent', sched: 'Today', checkin: false }
      ];

      for (let i = 0; i < Math.min(issues.length, jobSpecs.length); i++) {
        const iss = issues[i];
        const spec = jobSpecs[i];
        const stepPlan = getFallbackSteps(iss.category || 'pothole');
        const scheduledDate = new Date().toISOString().split('T')[0];

        const { rows: jobRows } = await pool.query(`
          INSERT INTO job_assignments (issue_id, worker_id, assigned_by, status, priority, scheduled_date, estimated_duration_hours, step_plan, checkin_time)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${spec.checkin ? "NOW() - interval '1 hour'" : 'NULL'})
          RETURNING id
        `, [iss.id, workerId, authorityId || citizenId, spec.status, spec.priority, scheduledDate, stepPlan.total_estimated_hours || 4, JSON.stringify(stepPlan)]);

        const jobId = jobRows[0]?.id;
        if (jobId && ['in_progress', 'pending_approval', 'completed'].includes(spec.status)) {
          for (let s = 1; s <= Math.min(2, stepPlan.steps?.length || 2); s++) {
            await pool.query(`
              INSERT INTO work_steps (job_id, step_number, step_label, photo_url, ai_verified, ai_feedback)
              VALUES ($1, $2, $3, $4, true, 'Verified step execution.')
            `, [jobId, s, stepPlan.steps[s - 1]?.label || `Step ${s}`, 'https://images.unsplash.com/photo-1584463623578-3b3b44b82fc6?auto=format&fit=crop&w=800&q=80']);
          }
        }
      }
    }

    return { seeded: true, message: 'Rich mock data successfully loaded for Citizen and Worker dashboards!' };
  } catch (err) {
    console.error('Seeding error:', err.message);
    throw err;
  }
}
