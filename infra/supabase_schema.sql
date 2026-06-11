-- Supabase migrations for Job Applier 2026
-- Run these in the Supabase SQL editor or via supabase CLI

-- ========================================
-- Jobs table: scraped from all platforms
-- ========================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    salary_range TEXT,
    description TEXT,
    url TEXT NOT NULL,
    posted_date TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT now(),
    is_easy_apply BOOLEAN DEFAULT false,
    embedding_id TEXT,
    match_score FLOAT,
    UNIQUE(platform, external_id)
);

-- ========================================
-- Applications table: apply attempts
-- ========================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'queued',
    apply_type TEXT,
    cover_letter TEXT,
    applied_at TIMESTAMPTZ,
    error TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- Application status: kanban board state
-- ========================================
CREATE TABLE IF NOT EXISTS application_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    platform_status TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- Scrape runs: track scraping executions
-- ========================================
CREATE TABLE IF NOT EXISTS scrape_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    jobs_found INT DEFAULT 0,
    jobs_new INT DEFAULT 0,
    status TEXT DEFAULT 'running'
);

-- ========================================
-- Indexes for common queries
-- ========================================
CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform);
CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_application_status_app_id ON application_status(application_id);
CREATE INDEX IF NOT EXISTS idx_scrape_runs_platform ON scrape_runs(platform);

-- ========================================
-- Supabase Realtime: enable for live dashboard updates
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE applications;
ALTER PUBLICATION supabase_realtime ADD TABLE application_status;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE scrape_runs;
