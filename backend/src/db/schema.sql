CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  role VARCHAR(50) DEFAULT 'citizen',
  department VARCHAR(100),
  civic_score INTEGER DEFAULT 0,
  community_service_hours FLOAT DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT false,
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  severity VARCHAR(20),
  status VARCHAR(50) DEFAULT 'open',
  photo_url TEXT,
  resolved_photo_url TEXT,
  latitude FLOAT,
  longitude FLOAT,
  location_name TEXT,
  reported_by UUID REFERENCES users(id),
  is_anonymous BOOLEAN DEFAULT false,
  anonymous_token TEXT,
  assigned_department VARCHAR(100),
  estimated_cost NUMERIC(10,2),
  sponsored_amount NUMERIC(10,2) DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  flags INTEGER DEFAULT 0,
  duplicate_of UUID REFERENCES issues(id),
  affected_count INTEGER DEFAULT 1,
  escalation_level INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_issues_status ON issues (status);
CREATE INDEX idx_issues_category ON issues (category);
CREATE INDEX idx_issues_created_at ON issues (created_at);
CREATE INDEX idx_issues_lat_lng ON issues (latitude, longitude);

CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(issue_id, user_id)
);

CREATE TABLE sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  sponsor_id UUID REFERENCES users(id),
  amount NUMERIC(10,2),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE escalation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  escalation_level INTEGER,
  notified_to TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE score_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  points INTEGER,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  badge_key VARCHAR(100),
  badge_label VARCHAR(100),
  awarded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

CREATE TABLE satisfaction_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(issue_id, user_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  issue_id UUID REFERENCES issues(id),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Haversine distance in meters (works without PostGIS)
CREATE OR REPLACE FUNCTION haversine_meters(lat1 float, lng1 float, lat2 float, lng2 float)
RETURNS float AS $$
  SELECT 6371000 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
    COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * POWER(SIN(RADIANS(lng2 - lng1) / 2), 2)
  ));
$$ LANGUAGE SQL IMMUTABLE;
