-- Migration: 001_jobs_table.sql
-- Run via: supabase db push  OR  psql $DATABASE_URL -f this_file.sql

create extension if not exists "uuid-ossp";

create table if not exists jobs (
  id              text primary key,           -- sha256[:16] stable dedup key
  title           text not null,
  company         text not null,
  location        text,
  remote          boolean not null default false,
  job_type        text,                        -- fulltime | parttime | contract | internship
  source          text not null,               -- greenhouse | lever | ashby | jobspy | remoteok | wwr
  apply_url       text,
  description     text,

  -- salary (flattened)
  salary_min      numeric,
  salary_max      numeric,
  salary_currency text default 'USD',
  salary_interval text,                        -- yearly | monthly | hourly

  -- matching
  match_score     float,                       -- cosine similarity vs. user resume, 0-1

  -- timestamps
  posted_at       timestamptz,
  scraped_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes for common filter patterns
create index if not exists jobs_match_score_idx  on jobs (match_score desc nulls last);
create index if not exists jobs_scraped_at_idx   on jobs (scraped_at desc);
create index if not exists jobs_source_idx       on jobs (source);
create index if not exists jobs_remote_idx       on jobs (remote);
create index if not exists jobs_posted_at_idx    on jobs (posted_at desc nulls last);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_updated_at on jobs;
create trigger jobs_updated_at
  before update on jobs
  for each row execute procedure update_updated_at();

-- Enable Supabase Realtime
alter publication supabase_realtime add table jobs;