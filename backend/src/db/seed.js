import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

const MUMBAI = { lat: 19.076, lng: 72.877 };
const CATEGORIES = ['pothole', 'water_leakage', 'streetlight', 'waste', 'road_damage', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'verified', 'in_progress', 'resolved', 'open', 'open', 'verified'];
const DEPARTMENTS = { pothole: 'Roads', road_damage: 'Roads', water_leakage: 'Water', streetlight: 'Electricity', waste: 'Waste', other: 'Parks' };

const CATEGORY_IMAGES = {
  pothole: [
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584463623578-3b3b44b82fc6?auto=format&fit=crop&w=800&q=80'
  ],
  water_leakage: [
    'https://images.unsplash.com/photo-1542013936693-8c463f88e0b0?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80'
  ],
  streetlight: [
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1541888946425-d0ebb18086f6?auto=format&fit=crop&w=800&q=80'
  ],
  waste: [
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1?auto=format&fit=crop&w=800&q=80'
  ],
  road_damage: [
    'https://images.unsplash.com/photo-1584463623578-3b3b44b82fc6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80'
  ],
  other: [
    'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1590086782792-42dd2350140d?auto=format&fit=crop&w=800&q=80'
  ]
};

function randomOffset(maxKm = 15) {
  const r = maxKm / 111;
  const angle = Math.random() * 2 * Math.PI;
  const dist = Math.random() * r;
  return { lat: MUMBAI.lat + dist * Math.cos(angle), lng: MUMBAI.lng + dist * Math.sin(angle) };
}

function randomDate(monthsAgo = 18) {
  const now = Date.now();
  const past = now - monthsAgo * 30 * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

async function seed() {
  console.log('Seeding Community Hero database...');
  const hash = await bcrypt.hash('password123', 10);

  // Authority users
  const authorities = [
    { name: 'Roads Head', email: 'roads@mumbai.gov.in', department: 'Roads' },
    { name: 'Water Head', email: 'water@mumbai.gov.in', department: 'Water' },
    { name: 'Electricity Head', email: 'electricity@mumbai.gov.in', department: 'Electricity' },
    { name: 'Waste Head', email: 'waste@mumbai.gov.in', department: 'Waste' },
    { name: 'Parks Head', email: 'parks@mumbai.gov.in', department: 'Parks' },
  ];

  const authorityIds = [];
  for (const a of authorities) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES ($1, $2, $3, 'authority', $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [a.name, a.email, hash, a.department]
    );
    authorityIds.push(rows[0].id);
  }

  // NGO users
  const ngoIds = [];
  for (let i = 1; i <= 3; i++) {
    const pos = randomOffset(5);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, latitude, longitude)
       VALUES ($1, $2, $3, 'ngo', $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [`NGO Worker ${i}`, `ngo${i}@example.com`, hash, pos.lat, pos.lng]
    );
    ngoIds.push(rows[0].id);
  }

  // Citizen users
  const citizenIds = [];
  for (let i = 1; i <= 20; i++) {
    const score = Math.floor(Math.random() * 400);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, civic_score)
       VALUES ($1, $2, $3, 'citizen', $4)
       ON CONFLICT (email) DO UPDATE SET civic_score = EXCLUDED.civic_score
       RETURNING id`,
      [`Citizen ${i}`, `citizen${i}@example.com`, hash, score]
    );
    citizenIds.push(rows[0].id);
  }

  // School reporter
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, civic_score, community_service_hours)
     VALUES ($1, $2, $3, 'school_reporter', 120, 15)
     ON CONFLICT (email) DO NOTHING`,
    ['School Reporter', 'school@example.com', hash]
  );

  // Demo login user
  const { rows: demoUser } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, civic_score)
     VALUES ('Demo Citizen', 'demo@communityhero.in', $1, 'citizen', 85)
     ON CONFLICT (email) DO UPDATE SET civic_score = 85
     RETURNING id`,
    [hash]
  );
  citizenIds.push(demoUser[0].id);

  const issueIds = [];
  const titles = {
    pothole: ['Deep pothole on main road', 'Crater near intersection', 'Road damage hazard'],
    water_leakage: ['Burst water pipe', 'Street flooding from leak', 'Water main break'],
    streetlight: ['Broken streetlight', 'Dark alley no lighting', 'Flickering lamp post'],
    waste: ['Garbage pile uncollected', 'Illegal dumping site', 'Overflowing bin'],
    road_damage: ['Cracked pavement', 'Sinkhole forming', 'Damaged footpath'],
    other: ['Fallen tree branch', 'Broken bench in park', 'Graffiti on wall'],
  };

  for (let i = 0; i < 50; i++) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const pos = randomOffset(12);
    let createdAt = randomDate(18);

    // Seasonal spike for water_leakage in June-July
    if (category === 'water_leakage' && i < 8) {
      const year = Math.random() > 0.5 ? 2025 : 2024;
      createdAt = new Date(`${year}-0${Math.random() > 0.5 ? 6 : 7}-${Math.floor(Math.random() * 28) + 1}`);
    }

    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)];
    const reporter = citizenIds[Math.floor(Math.random() * citizenIds.length)];
    const titleList = titles[category];
    const title = titleList[Math.floor(Math.random() * titleList.length)];
    const resolvedAt = status === 'resolved' ? new Date(createdAt.getTime() + Math.random() * 14 * 86400000) : null;
    const escalation = createdAt < new Date(Date.now() - 21 * 86400000) && status !== 'resolved' ? (Math.random() > 0.5 ? 2 : 1) : 0;

    const { rows } = await pool.query(
      `INSERT INTO issues (
        title, description, category, severity, status, photo_url,
        latitude, longitude, reported_by, assigned_department,
        estimated_cost, upvotes, affected_count, escalation_level, created_at, resolved_at,
        location_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id`,
      [
        title,
        `Reported ${category} issue in Mumbai area requiring attention.`,
        category,
        severity,
        status,
        (CATEGORY_IMAGES[category] || CATEGORY_IMAGES.other)[i % (CATEGORY_IMAGES[category] || CATEGORY_IMAGES.other).length],
        pos.lat,
        pos.lng,
        reporter,
        DEPARTMENTS[category],
        Math.floor(Math.random() * 50000) + 2000,
        Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 5) + 1,
        escalation,
        createdAt,
        resolvedAt,
        `Mumbai Ward ${Math.floor(Math.random() * 20) + 1}`,
      ]
    );
    issueIds.push(rows[0].id);
  }

  // Escalation logs for old issues
  const oldIssues = issueIds.slice(0, 5);
  for (const id of oldIssues) {
    await pool.query(
      `INSERT INTO escalation_logs (issue_id, escalation_level, notified_to, reason)
       VALUES ($1, 2, 'ngo1@example.com', 'Unresolved for 21+ days')`,
      [id]
    );
  }

  // Sponsorships
  for (let i = 0; i < 10; i++) {
    const issueId = issueIds[Math.floor(Math.random() * issueIds.length)];
    const sponsorId = citizenIds[Math.floor(Math.random() * citizenIds.length)];
    const amount = Math.floor(Math.random() * 5000) + 500;
    await pool.query(
      'INSERT INTO sponsorships (issue_id, sponsor_id, amount, message) VALUES ($1, $2, $3, $4)',
      [issueId, sponsorId, amount, 'Happy to help fix this!']
    );
    await pool.query('UPDATE issues SET sponsored_amount = sponsored_amount + $1 WHERE id = $2', [amount, issueId]);
  }

  // Satisfaction ratings for resolved issues
  const { rows: resolved } = await pool.query(`SELECT id, reported_by FROM issues WHERE status = 'resolved' LIMIT 10`);
  for (const issue of resolved) {
    if (issue.reported_by) {
      await pool.query(
        'INSERT INTO satisfaction_ratings (issue_id, user_id, rating) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [issue.id, issue.reported_by, Math.floor(Math.random() * 3) + 3]
      );
    }
  }

  // Sample badges
  await pool.query(
    `INSERT INTO badges (user_id, badge_key, badge_label) VALUES ($1, 'first_reporter', 'First Reporter') ON CONFLICT DO NOTHING`,
    [citizenIds[0]]
  );
  await pool.query(
    `INSERT INTO badges (user_id, badge_key, badge_label) VALUES ($1, 'civic_champion', 'Civic Champion') ON CONFLICT DO NOTHING`,
    [citizenIds[1]]
  );

  await pool.query(
    `INSERT INTO badges (user_id, badge_key, badge_label) VALUES ($1, 'civic_champion', 'Civic Champion') ON CONFLICT DO NOTHING`,
    [citizenIds[1]]
  );

  // Workers (2 per department)
  const workerIds = [];
  const depts = ['Roads', 'Water', 'Electricity', 'Waste', 'Parks'];
  for (const dept of depts) {
    for (let i = 1; i <= 2; i++) {
      const email = `worker.${dept.toLowerCase()}${i}@nagarseva.in`;
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, department)
         VALUES ($1, $2, $3, 'worker', $4)
         ON CONFLICT (email) DO UPDATE SET department = EXCLUDED.department RETURNING id`,
        [`${dept} Worker ${i}`, email, hash, dept]
      );
      workerIds.push(rows[0].id);
    }
  }

  const { getFallbackSteps } = await import('../services/jobSteps.js');
  const roadsHead = authorityIds[0];

  // 20 job assignments
  const jobStatuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'in_progress', 'in_progress', 'in_progress', 'assigned', 'assigned', 'assigned', 'assigned', 'assigned', 'pending_approval', 'pending_approval', 'pending_approval', 'pending_approval', 'pending_approval', 'in_progress', 'assigned'];
  for (let i = 0; i < 20; i++) {
    const issueId = issueIds[i];
    const workerId = workerIds[i % workerIds.length];
    const status = jobStatuses[i];
    const { rows: iss } = await pool.query('SELECT category, description, severity FROM issues WHERE id = $1', [issueId]);
    const stepPlan = getFallbackSteps(iss[0].category);
    const scheduledDate = new Date(Date.now() + (i % 7) * 86400000).toISOString().split('T')[0];
    const { rows: job } = await pool.query(
      `INSERT INTO job_assignments (issue_id, worker_id, assigned_by, status, priority, scheduled_date, estimated_duration_hours, step_plan, checkin_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, ${status !== 'assigned' ? "NOW() - interval '2 hours'" : 'NULL'})
       RETURNING id`,
      [issueId, workerId, roadsHead, status, i % 4 === 0 ? 'urgent' : 'normal', scheduledDate, stepPlan.total_estimated_hours, JSON.stringify(stepPlan)]
    );

    if (['in_progress', 'completed', 'pending_approval'].includes(status)) {
      for (let s = 1; s <= Math.min(3, stepPlan.steps.length); s++) {
        await pool.query(
          `INSERT INTO work_steps (job_id, step_number, step_label, photo_url, ai_verified, ai_feedback)
           VALUES ($1,$2,$3,$4,true,'Photo verified')`,
          [job[0].id, s, stepPlan.steps[s - 1].label, (CATEGORY_IMAGES[iss[0].category] || CATEGORY_IMAGES.other)[(i + s) % (CATEGORY_IMAGES[iss[0].category] || CATEGORY_IMAGES.other).length]]
        );
      }
    }
    if (status === 'completed') {
      await pool.query(`UPDATE job_assignments SET supervisor_approved = true, completed_at = NOW() WHERE id = $1`, [job[0].id]);
    }
  }

  // SOS alerts
  const { rows: activeJobs } = await pool.query(`SELECT id, worker_id FROM job_assignments LIMIT 2`);
  for (const j of activeJobs) {
    await pool.query(
      `INSERT INTO sos_alerts (job_id, worker_id, latitude, longitude, reason, resolved) VALUES ($1,$2,19.07,72.87,'Equipment failure',true)`,
      [j.id, j.worker_id]
    );
  }

  // Performance scores
  for (const wid of workerIds.slice(0, 5)) {
    await pool.query(
      `INSERT INTO worker_performance (worker_id, month, jobs_assigned, jobs_completed, performance_score)
       VALUES ($1, DATE_TRUNC('month', NOW())::date, 4, 2, 72) ON CONFLICT DO NOTHING`,
      [wid]
    );
  }

  console.log('Seed complete!');
  console.log('Demo accounts (password: password123):');
  console.log('  demo@communityhero.in (citizen)');
  console.log('  roads@mumbai.gov.in (authority - Roads dept)');
  console.log('  worker.roads1@nagarseva.in (worker - Roads)');

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
