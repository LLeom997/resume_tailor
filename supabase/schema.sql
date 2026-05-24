-- Resume Tailor Complete Database Schema
-- ---------------------------------------------------------
-- Copy and paste this script directly into your Supabase SQL Editor.
-- It initializes all extensions, tables, indices, and foreign key cascades.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- 1. RESUMES TABLE (Stores master and legacy resumes)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  name text NOT NULL,
  content jsonb NOT NULL,
  is_master boolean NOT NULL DEFAULT false,
  profile_id uuid,
  export_meta jsonb DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resumes_session_id ON resumes (session_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_master ON resumes (is_master);

-- ---------------------------------------------------------
-- 2. PERSONAS TABLE (Dynamic career personas with usage statistics)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT 'Briefcase',
  color text DEFAULT 'zinc',
  usage_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personas_session_id ON personas (session_id);

-- ---------------------------------------------------------
-- 3. RESUME VARIATIONS TABLE (Tracks specific target details and lifecycles)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  persona_id uuid REFERENCES personas(id) ON DELETE CASCADE,
  master_resume_id uuid, -- Reference to resumes (where is_master = true)
  company_name text NOT NULL DEFAULT 'Company',
  role_title text NOT NULL DEFAULT 'Role',
  status text NOT NULL DEFAULT 'draft', -- draft, tailored, applied, interview, shortlisted, rejected, offer, closed
  version integer NOT NULL DEFAULT 1,
  jd_text text DEFAULT '',
  resume_content jsonb NOT NULL,
  job_id text DEFAULT '',
  job_link text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status_updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variations_session_id ON resume_variations (session_id);
CREATE INDEX IF NOT EXISTS idx_variations_persona_id ON resume_variations (persona_id);
CREATE INDEX IF NOT EXISTS idx_variations_job_id ON resume_variations (job_id);

-- ---------------------------------------------------------
-- 4. RESUME ACTIVITY TABLE (Logs historical optimizations and status changes)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  persona_id uuid REFERENCES personas(id) ON DELETE CASCADE,
  variation_id uuid REFERENCES resume_variations(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- optimize, export_pdf, update_status, create_persona
  metadata jsonb DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_session_id ON resume_activity (session_id);
CREATE INDEX IF NOT EXISTS idx_activity_persona_id ON resume_activity (persona_id);
CREATE INDEX IF NOT EXISTS idx_activity_variation_id ON resume_activity (variation_id);

-- ---------------------------------------------------------
-- 5. JOB APPLICATIONS TABLE (Tracks tailored jobs and suggestions)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  master_resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE,
  job_description text NOT NULL,
  generated_resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  ai_suggestions jsonb DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_session_id ON job_applications (session_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_master_id ON job_applications (master_resume_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_generated_id ON job_applications (generated_resume_id);

-- ---------------------------------------------------------
-- 6. RESUME HISTORY TABLE (Tracks incremental snapshots and descriptions of edits)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  change_description text NOT NULL,
  previous_content jsonb NOT NULL,
  new_content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_resume_id ON resume_history (resume_id);
CREATE INDEX IF NOT EXISTS idx_history_session_id ON resume_history (session_id);
