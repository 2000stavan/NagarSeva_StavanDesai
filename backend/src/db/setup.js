#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');
const dbName = 'community_hero';
const dbUser = process.env.PGUSER || process.env.USER || 'postgres';

console.log('Setting up Community Hero database...');

try {
  execSync(`psql -U ${dbUser} -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`, { stdio: 'pipe' });
  const exists = execSync(`psql -U ${dbUser} -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`, { encoding: 'utf8' }).trim();
  if (!exists) {
    execSync(`psql -U ${dbUser} -d postgres -c "CREATE DATABASE ${dbName}"`, { stdio: 'inherit' });
  }
  execSync(`psql -U ${dbUser} -d ${dbName} -f "${schemaPath}"`, { stdio: 'inherit' });
  const workerSchema = path.join(__dirname, 'worker-schema.sql');
  execSync(`psql -U ${dbUser} -d ${dbName} -f "${workerSchema}"`, { stdio: 'inherit' });
  console.log('Database schema applied successfully.');
} catch (err) {
  console.error('Setup failed:', err.message);
  process.exit(1);
}
