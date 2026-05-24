-- Career profiles + resume export metadata
-- Run in Supabase SQL editor if not using Supabase CLI migrations.

create table if not exists career_profiles (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  name text not null,
  slug text not null,
  description text default '',
  master_resume_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, slug)
);

alter table resumes add column if not exists profile_id uuid references career_profiles(id) on delete set null;
alter table resumes add column if not exists export_meta jsonb default null;

create index if not exists idx_resumes_profile_id on resumes (profile_id);
create index if not exists idx_career_profiles_session_id on career_profiles (session_id);
