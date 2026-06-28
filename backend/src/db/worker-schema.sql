-- Worker module migration (safe to re-run)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS job_id UUID;

CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'assigned',
  priority VARCHAR(20) DEFAULT 'normal',
  scheduled_date DATE,
  estimated_duration_hours FLOAT,
  actual_duration_hours FLOAT,
  checkin_time TIMESTAMP,
  checkout_time TIMESTAMP,
  checkin_latitude FLOAT,
  checkin_longitude FLOAT,
  checkin_verified BOOLEAN DEFAULT false,
  checkin_override_reason TEXT,
  supervisor_approved BOOLEAN DEFAULT false,
  supervisor_id UUID REFERENCES users(id),
  supervisor_notes TEXT,
  sos_triggered BOOLEAN DEFAULT false,
  qr_code_url TEXT,
  step_plan JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_assignments(id) ON DELETE CASCADE,
  step_number INTEGER,
  step_label VARCHAR(255),
  photo_url TEXT,
  notes TEXT,
  ai_verified BOOLEAN DEFAULT false,
  ai_feedback TEXT,
  override_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_assignments(id) ON DELETE CASCADE,
  material_name VARCHAR(255),
  quantity FLOAT,
  unit VARCHAR(50),
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id),
  summary_date DATE,
  jobs_completed INTEGER DEFAULT 0,
  jobs_in_progress INTEGER DEFAULT 0,
  total_hours_worked FLOAT DEFAULT 0,
  summary_text TEXT,
  summary_json JSONB,
  sent_to_supervisor BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(worker_id, summary_date)
);

CREATE TABLE IF NOT EXISTS sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_assignments(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id),
  latitude FLOAT,
  longitude FLOAT,
  reason TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id),
  action_type VARCHAR(100),
  payload JSONB,
  synced BOOLEAN DEFAULT false,
  created_locally_at TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id),
  month DATE,
  jobs_assigned INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  avg_completion_hours FLOAT,
  citizen_satisfaction_avg FLOAT,
  sos_count INTEGER DEFAULT 0,
  performance_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(worker_id, month)
);

CREATE TABLE IF NOT EXISTS worker_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES users(id),
  badge_key VARCHAR(100),
  badge_label VARCHAR(100),
  awarded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(worker_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_jobs_worker ON job_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_assignments(status);
CREATE INDEX IF NOT EXISTS idx_jobs_issue ON job_assignments(issue_id);
