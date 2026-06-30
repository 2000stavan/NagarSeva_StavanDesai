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

      console.log('Automated Deployment: Seeding demo accounts and mock civic data...');
      const hash = await bcrypt.hash('password123', 10);
      
      // Seed Demo Accounts
      await pool.query(`
        INSERT INTO users (email, password_hash, name, role, department, karma_points)
        VALUES 
          ('demo@communityhero.in', $1, 'Priya Sharma', 'citizen', NULL, 120),
          ('roads@mumbai.gov.in', $1, 'Rajesh Gupta', 'authority', 'Roads', 0),
          ('worker.roads1@nagarseva.in', $1, 'Suresh Kumar', 'worker', 'Roads', 0),
          ('supervisor@mumbai.gov.in', $1, 'Amit Verma', 'supervisor', 'Roads', 0),
          ('admin@mumbai.gov.in', $1, 'NagarSeva Admin', 'admin', 'Roads', 0)
        ON CONFLICT (email) DO NOTHING;
      `, [hash]);

      // Seed departments
      const depts = ['Roads', 'Water', 'Electricity', 'Waste', 'Parks', 'Sanitation'];
      for (const d of depts) {
        await pool.query(`INSERT INTO departments (name, description) VALUES ($1, $1 || ' Department') ON CONFLICT DO NOTHING`, [d]);
      }

      // Seed initial issue
      const userRes = await pool.query(`SELECT id FROM users WHERE email = 'demo@communityhero.in'`);
      const citizenId = userRes.rows[0]?.id || 1;
      await pool.query(`
        INSERT INTO issues (title, description, category, severity, status, lat, lng, address, department, created_by)
        VALUES ('Deep Pothole near Station Road', 'Severe road damage causing traffic congestion.', 'pothole', 'high', 'verified', 19.076, 72.877, 'Station Road, Mumbai', 'Roads', $1)
      `, [citizenId]);

      console.log('Automated Deployment: Database initialized successfully!');
      return { initialized: true, message: 'Created tables and seeded demo accounts.' };
    }
    return { initialized: false, message: 'Database tables already exist.' };
  } catch (err) {
    console.warn('Auto initialization check notice:', err.message);
    throw err;
  }
}
