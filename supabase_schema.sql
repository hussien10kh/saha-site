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

-- ---------------------------------------------------------------
-- لوحة الأدمن — صلاحيات ناقصة بالسياسات الأصلية (شغّلها مرة وحدة بـSQL Editor):
--   1) حذف مكان سياحي نهائياً: كان في تعديل للمشرف بس بلا حذف.
--   2) حجوزات ملعبك: السياسة الأصلية "own only" بتخلّي المشرف يشوف حجوزاته
--      هو بس — تبويب الحجوزات باللوحة بدو قراءة وتعديل لكل الحجوزات.
-- الاثنين إضافيّين (permissive) — ما بيضيّقوا شي موجود.
-- ---------------------------------------------------------------
drop policy if exists "Admins delete tourism places" on public.tourism_places;
create policy "Admins delete tourism places"
on public.tourism_places for delete
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Admins read all bookings" on public.malaabak_bookings;
create policy "Admins read all bookings"
on public.malaabak_bookings for select
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Admins update all bookings" on public.malaabak_bookings;
create policy "Admins update all bookings"
on public.malaabak_bookings for update
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ---------------------------------------------------------------
-- إحصائيات داخلية — site_events (بيكتبها js/site-stats.js من كل صفحة، وبتقراها
-- لوحة الأدمن بتبويب "الزوار"). شغّلها مرة وحدة بـSQL Editor.
--   * بلا بيانات شخصية: لا IP ولا اسم ولا بريد. user_id بينكتب بس لو المستخدم
--     مسجّل وبعت توكنه (السياسة بتفرض user_id = auth.uid()).
--   * الإدخال مفتوح للكل (زوار مجهولين) — مقيّد بأطوال الأعمدة وقيم النوع.
--   * القراءة والحذف للمشرفين بس.
-- ---------------------------------------------------------------
create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('pageview', 'pageleave', 'login', 'signup', 'post', 'step', 'error')),
  session_id text not null check (length(session_id) <= 40),
  visitor_id text check (length(visitor_id) <= 40),
  view_id text check (length(view_id) <= 40),
  user_id uuid,
  section text check (section in ('ads', 'tourism', 'malaab')),
  path text check (length(path) <= 300),
  title text check (length(title) <= 200),
  referrer text check (length(referrer) <= 300),
  utm_source text check (length(utm_source) <= 100),
  utm_medium text check (length(utm_medium) <= 100),
  utm_campaign text check (length(utm_campaign) <= 150),
  device text check (device in ('mobile', 'desktop')),
  duration_sec int check (duration_sec between 0 and 86400),
  meta jsonb check (meta is null or pg_column_size(meta) <= 2000)
);
create index if not exists site_events_created_idx on public.site_events (created_at desc);
create index if not exists site_events_session_idx on public.site_events (session_id);

alter table public.site_events enable row level security;

drop policy if exists "Anyone can record site events" on public.site_events;
create policy "Anyone can record site events"
on public.site_events for insert
with check (user_id is null or user_id = auth.uid());

drop policy if exists "Admins read site events" on public.site_events;
create policy "Admins read site events"
on public.site_events for select
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Admins delete site events" on public.site_events;
create policy "Admins delete site events"
on public.site_events for delete
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- إضافة أنواع "step" (خطوات مسار الزائر: تواصل، بدء نموذج، ضغط نشر) و"error" (أخطاء الزوار)
-- لجدول الإحصائيات — شغّلها لو الجدول كان منشأ بالنسخة الأولى:
alter table public.site_events drop constraint if exists site_events_type_check;
alter table public.site_events add constraint site_events_type_check
  check (type in ('pageview', 'pageleave', 'login', 'signup', 'post', 'step', 'error'));
