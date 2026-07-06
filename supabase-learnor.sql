-- Learnor autonomous course engine — run in the Supabase SQL editor.
-- Tables for the request queue + published course shelf, plus the seed
-- launch catalog. All reads/writes from the app go through the server
-- with the service role key; RLS denies direct client access except
-- reading published course metadata.

create extension if not exists pgcrypto;

create table if not exists public.course_requests (
  id              uuid primary key default gen_random_uuid(),
  topic           text not null,
  brief           jsonb,                    -- structured understanding from intake AI
  expectations    text,                     -- what "done well" means to THIS person
  level           text,                     -- beginner | some | advanced
  metadata        jsonb,                    -- goal, use-case, depth, format prefs, time budget
  requester_email text not null,
  status          text not null default 'pending',
                  -- pending | building | pending_review | changes_requested
                  -- | approved | published | failed | needs_clarification
  slug            text unique,
  category        text,
  preview_url     text,                     -- unlisted render for Itish's review
  review_notes    text,                     -- Itish's feedback on a rejection
  attempts        int  not null default 0,
  error           text,
  built_by        text,                     -- 'auto' | 'itish'
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists public.courses (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  category       text,
  subject        text,
  level          text,
  request_id     uuid references public.course_requests(id),
  content        jsonb not null default '{}'::jsonb,  -- sections / quiz / exercises
  preview_token  text,                                -- unlisted preview access key
  is_marketplace boolean default false,               -- flipped true if requester opts in
  rev_share      jsonb default '{"author":60,"platform":40}'::jsonb,
  published_at   timestamptz,
  created_at     timestamptz default now()
);

create index if not exists course_requests_status_idx on public.course_requests (status, created_at);
create index if not exists courses_published_idx on public.courses (published_at);

alter table public.course_requests enable row level security;
alter table public.courses enable row level security;

-- Clients may read published course metadata directly; everything else is
-- service-role only (the Express server holds the service key).
drop policy if exists "Anyone can read published courses" on public.courses;
create policy "Anyone can read published courses"
on public.courses for select
using (published_at is not null);

-- ── LAUNCH CATALOG ────────────────────────────────────────────────────────────
-- Seed rows the worker grinds through autonomously. Each still passes the
-- Itish review gate before publishing. Re-running this file is safe: rows
-- are only inserted if a request with the same topic doesn't already exist.

insert into public.course_requests (topic, brief, expectations, level, metadata, requester_email, built_by, category)
select v.topic,
       jsonb_build_object(
         'scope', 'complete, practical, end-to-end; beginner-friendly but taken all the way to real proficiency',
         'angle', 'first principles to applied, with examples everywhere',
         'exclude', 'filler history sections, vendor marketing, video-course padding'
       ),
       'A complete end-to-end course: someone starting near zero finishes able to work with this for real — projects, jobs, interviews.',
       'beginner',
       jsonb_build_object('goal', 'real proficiency', 'depth', 'end-to-end', 'source', 'launch catalog', 'tier', v.tier),
       'catalog@learnor.io',
       'itish',
       v.category
from (values
  -- Tier 1 — flagship end-to-end (build first)
  (1, 'Complete Python — End to End',                              'Programming'),
  (1, 'Complete SQL — End to End',                                 'Programming'),
  (1, 'Complete JavaScript — End to End',                          'Programming'),
  (1, 'Complete Git & GitHub — End to End',                        'Programming'),
  (1, 'Data Analysis with Python (pandas, NumPy) — End to End',    'Data & AI'),
  -- Tier 2 — the high-demand core
  (2, 'Complete React — End to End',                               'Web Development'),
  (2, 'Complete Next.js — End to End',                             'Web Development'),
  (2, 'HTML & CSS Foundations — End to End',                       'Web Development'),
  (2, 'Machine Learning — End to End',                             'Data & AI'),
  (2, 'Prompt Engineering & Building with LLMs — End to End',      'Data & AI'),
  (2, 'Statistics for Data Science — End to End',                  'Data & AI'),
  (2, 'Command Line & Linux Basics — End to End',                  'Programming'),
  -- Tier 3 — round out the shelf
  (3, 'Complete TypeScript — End to End',                          'Programming'),
  (3, 'Node.js & Backend APIs — End to End',                       'Web Development'),
  (3, 'Docker for Developers — End to End',                        'Cloud & DevOps'),
  (3, 'Deep Learning — End to End',                                'Data & AI'),
  (3, 'Data Engineering (Spark, Airflow, warehouses) — End to End','Data & AI'),
  (3, 'AWS Cloud Foundations — End to End',                        'Cloud & DevOps'),
  (3, 'Product Management 101 — End to End',                       'Product & Growth'),
  (3, 'Growth & Distribution for Builders — End to End',           'Product & Growth')
) as v(tier, topic, category)
where not exists (
  select 1 from public.course_requests r where r.topic = v.topic
);
