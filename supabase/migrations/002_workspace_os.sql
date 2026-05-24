-- Professional Career Workspace OS Consolidated Migration & Schema
-- Tracks the complete SQL schema and handles migration from legacy formats.

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- 1. RESUMES TABLE (Stores master and legacy resumes)
-- ---------------------------------------------------------
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  content jsonb not null,
  is_master boolean not null default false,
  profile_id uuid,
  export_meta jsonb default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resumes_session_id on resumes (session_id);
create index if not exists idx_resumes_is_master on resumes (is_master);


-- ---------------------------------------------------------
-- 2. PERSONAS TABLE (Dynamic career personas with usage statistics)
-- ---------------------------------------------------------
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  description text default '',
  icon text default 'Briefcase',
  color text default 'zinc',
  usage_count integer not null default 0,
  last_accessed_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personas_session_id on personas (session_id);


-- ---------------------------------------------------------
-- 3. MIGRATION: Existing career_profiles to personas (if table exists)
-- ---------------------------------------------------------
do $$
begin
  if exists (select from information_schema.tables where table_name = 'career_profiles') then
    insert into personas (id, session_id, name, description, created_at, updated_at)
    select id, session_id, name, description, created_at, updated_at
    from career_profiles
    on conflict do nothing;
  end if;
end $$;


-- ---------------------------------------------------------
-- 4. RESUME VARIATIONS TABLE (Tracks specific target details and lifecycles)
-- ---------------------------------------------------------
create table if not exists resume_variations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  persona_id uuid references personas(id) on delete cascade,
  master_resume_id uuid, -- Reference to resumes (where is_master = true)
  company_name text not null default 'Company',
  role_title text not null default 'Role',
  status text not null default 'draft', -- draft, tailored, applied, interview, shortlisted, rejected, offer
  version integer not null default 1,
  jd_text text default '',
  resume_content jsonb not null,
  job_id text default '',
  job_link text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_updated_at timestamptz default now()
);

create index if not exists idx_variations_session_id on resume_variations (session_id);
create index if not exists idx_variations_persona_id on resume_variations (persona_id);


-- ---------------------------------------------------------
-- 5. MIGRATION: Existing tailored resumes to resume_variations
-- ---------------------------------------------------------
do $$
begin
  if exists (select from information_schema.tables where table_name = 'resumes') then
    insert into resume_variations (
      id, session_id, persona_id, master_resume_id, company_name, role_title, status, resume_content, created_at, updated_at
    )
    select 
      r.id, 
      r.session_id, 
      r.profile_id, 
      (select id from resumes where session_id = r.session_id and is_master = true limit 1),
      coalesce(r.export_meta->>'company', 'Company'),
      coalesce(r.export_meta->>'role', 'Role'),
      'tailored',
      r.content,
      r.created_at,
      r.updated_at
    from resumes r
    where r.is_master = false and r.profile_id is not null
    on conflict do nothing;
  end if;
end $$;


-- ---------------------------------------------------------
-- 6. RESUME ACTIVITY TABLE (Logs historical optimizations and status changes)
-- ---------------------------------------------------------
create table if not exists resume_activity (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  persona_id uuid references personas(id) on delete cascade,
  variation_id uuid references resume_variations(id) on delete cascade,
  action_type text not null, -- optimize, export_pdf, update_status, create_persona
  metadata jsonb default null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_session_id on resume_activity (session_id);
create index if not exists idx_activity_persona_id on resume_activity (persona_id);
create index if not exists idx_activity_variation_id on resume_activity (variation_id);


-- ---------------------------------------------------------
-- 7. JOB APPLICATIONS TABLE (Tracks tailored jobs and suggestions)
-- ---------------------------------------------------------
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  master_resume_id uuid references resumes(id) on delete cascade,
  job_description text not null,
  generated_resume_id uuid references resumes(id) on delete set null,
  ai_suggestions jsonb default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_job_applications_session_id on job_applications (session_id);
create index if not exists idx_job_applications_master_id on job_applications (master_resume_id);
create index if not exists idx_job_applications_generated_id on job_applications (generated_resume_id);
