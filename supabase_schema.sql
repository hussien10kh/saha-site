-- Sahat / Saaha public schema notes
-- Run in Supabase SQL editor when preparing a fresh project or auditing production.
-- Existing tables may already contain additional columns; keep those if present.

create table if not exists public.tourism_places (
  id uuid primary key default gen_random_uuid(),
  added_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  name text not null,
  category text not null default 'landmark',
  region text,
  city text not null,
  address text,
  description text,
  images text[] not null default '{}',
  video_url text,
  lat double precision,
  lng double precision,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tourism_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.tourism_places(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null default 'زائر',
  rating int not null check (rating between 1 and 5),
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.tourism_places enable row level security;
alter table public.tourism_reviews enable row level security;

drop policy if exists "Approved tourism places are public" on public.tourism_places;
create policy "Approved tourism places are public"
on public.tourism_places for select
using (status = 'approved' or added_by = auth.uid() or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
));

drop policy if exists "Signed in users add tourism places" on public.tourism_places;
create policy "Signed in users add tourism places"
on public.tourism_places for insert
with check (auth.uid() is not null and added_by = auth.uid());

drop policy if exists "Admins moderate tourism places" on public.tourism_places;
create policy "Admins moderate tourism places"
on public.tourism_places for update
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Tourism reviews are public" on public.tourism_reviews;
create policy "Tourism reviews are public"
on public.tourism_reviews for select
using (true);

drop policy if exists "Signed in users add tourism reviews" on public.tourism_reviews;
create policy "Signed in users add tourism reviews"
on public.tourism_reviews for insert
with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "Admins delete tourism reviews" on public.tourism_reviews;
create policy "Admins delete tourism reviews"
on public.tourism_reviews for delete
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
