-- Migration: Add Job ID and Job Link to Resume Variations
-- ---------------------------------------------------------

ALTER TABLE resume_variations ADD COLUMN IF NOT EXISTS job_id text default '';
ALTER TABLE resume_variations ADD COLUMN IF NOT EXISTS job_link text default '';

-- Also add index for quick lookup of specific jobs if needed
CREATE INDEX IF NOT EXISTS idx_variations_job_id ON resume_variations(job_id);
