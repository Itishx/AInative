alter table public.user_courses
add column if not exists profile jsonb not null default '{}'::jsonb;

-- Profile headline is stored inside the profile jsonb column as profile.headline.
-- This backfills existing rows with an explicit empty headline key without
-- changing any user's saved display name, bio, or avatar.
update public.user_courses
set profile = coalesce(profile, '{}'::jsonb) || jsonb_build_object('headline', coalesce(profile->>'headline', ''))
where profile is null or not (profile ? 'headline');

alter table public.user_courses
add column if not exists quiz_attempts jsonb not null default '[]'::jsonb;

-- Required for Supabase upsert(..., { onConflict: 'user_id' }) to update
-- the existing profile row instead of creating duplicate user rows.
create unique index if not exists user_courses_user_id_key
on public.user_courses (user_id);

alter table public.user_courses enable row level security;

drop policy if exists "Users can read own courses" on public.user_courses;
create policy "Users can read own courses"
on public.user_courses for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own courses" on public.user_courses;
create policy "Users can insert own courses"
on public.user_courses for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own courses" on public.user_courses;
create policy "Users can update own courses"
on public.user_courses for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
