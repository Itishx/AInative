alter table public.user_courses
add column if not exists profile jsonb not null default '{}'::jsonb;
