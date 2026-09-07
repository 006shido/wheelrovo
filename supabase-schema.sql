-- Wheelrovo — Friends feature schema
--
-- Run this in your Supabase project's SQL editor (Database > SQL Editor)
-- once EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are set in
-- your .env file and real Supabase Auth is wired up (isDemoMode = false).
--
-- This script is completely safe to run multiple times (idempotent).

-- =============================================================================
-- QUICK FIX FOR TERMINAL ERROR: "column profiles_1.is_private does not exist"
--
-- Copy & run this snippet in Supabase Dashboard > SQL Editor:
--   alter table profiles add column if not exists is_private boolean not null default true;
--   alter table profiles add column if not exists xp integer not null default 0;
--   alter table profiles add column if not exists level integer not null default 1;
--   notify pgrst, 'reload schema';
-- =============================================================================

-- =============================================================================
-- 1. PROFILES TABLE & POLICIES
-- =============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  display_name text not null,
  driver_type text not null default 'Casual',
  xp integer not null default 0,
  level integer not null default 1,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists xp integer not null default 0;
alter table profiles add column if not exists level integer not null default 1;
alter table profiles add column if not exists is_private boolean not null default true;

alter table profiles enable row level security;

drop policy if exists "Profiles are viewable by any authenticated user" on profiles;
create policy "Profiles are viewable by any authenticated user"
  on profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- =============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER & BACKFILL
-- =============================================================================
-- Automatically create a profile for every new user in auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, display_name, driver_type, is_private)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'driver_type', 'Casual'),
    coalesce((new.raw_user_meta_data->>'is_private')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill: populate profiles for any existing auth.users accounts
insert into public.profiles (id, email, username, display_name, driver_type)
select
  u.id,
  u.email,
  case 
    when exists (select 1 from public.profiles p where p.username = lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) and p.id <> u.id)
    then lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || substr(u.id::text, 1, 4)
    else lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
  end,
  split_part(u.email, '@', 1),
  'Casual'
from auth.users u
on conflict (id) do nothing;

-- =============================================================================
-- 2. FRIENDSHIPS TABLE & POLICIES
-- =============================================================================
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_email text not null references profiles(email) on delete cascade,
  addressee_email text not null references profiles(email) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_email, addressee_email)
);

alter table friendships enable row level security;

drop policy if exists "Users can view their own friendships" on friendships;
create policy "Users can view their own friendships"
  on friendships for select
  using (
    auth.jwt() ->> 'email' = requester_email
    or auth.jwt() ->> 'email' = addressee_email
  );

drop policy if exists "Users can send friend requests as themselves" on friendships;
create policy "Users can send friend requests as themselves"
  on friendships for insert
  with check (auth.jwt() ->> 'email' = requester_email);

drop policy if exists "Involved users can update friendship status" on friendships;
create policy "Involved users can update friendship status"
  on friendships for update
  using (
    auth.jwt() ->> 'email' = requester_email
    or auth.jwt() ->> 'email' = addressee_email
  );

drop policy if exists "Involved users can delete a friendship" on friendships;
create policy "Involved users can delete a friendship"
  on friendships for delete
  using (
    auth.jwt() ->> 'email' = requester_email
    or auth.jwt() ->> 'email' = addressee_email
  );

-- =============================================================================
-- 3. TRIPS TABLE & POLICIES
-- =============================================================================
create table if not exists trips (
  id text primary key, -- matches the client-generated trip id used locally
  user_email text not null references profiles(email) on delete cascade,
  started_at timestamptz not null,
  duration_sec integer not null,
  distance_km real not null,
  avg_speed_kmh real not null,
  top_speed_kmh real,
  coordinates jsonb default '[]'::jsonb,
  max_acceleration_ms2 real,
  max_braking_ms2 real,
  avg_acceleration_ms2 real,
  harsh_acceleration_events integer,
  harsh_braking_events integer,
  safety_score integer,
  smoothness_score integer,
  comfort_score integer,
  visibility text not null default 'friends' check (visibility in ('private', 'friends')),
  created_at timestamptz not null default now()
);

alter table trips add column if not exists coordinates jsonb default '[]'::jsonb;

alter table trips enable row level security;

drop policy if exists "Users can view their own trips" on trips;
create policy "Users can view their own trips"
  on trips for select
  using (auth.jwt() ->> 'email' = user_email);

drop policy if exists "Accepted friends can view shared trips" on trips;
drop policy if exists "Authenticated users can view shared trips" on trips;
create policy "Authenticated users can view shared trips"
  on trips for select
  using (
    auth.role() = 'authenticated'
    and visibility = 'friends'
  );

drop policy if exists "Users can insert their own trips" on trips;
create policy "Users can insert their own trips"
  on trips for insert
  with check (auth.jwt() ->> 'email' = user_email);

drop policy if exists "Users can update their own trips" on trips;
create policy "Users can update their own trips"
  on trips for update
  using (auth.jwt() ->> 'email' = user_email);

drop policy if exists "Users can delete their own trips" on trips;
create policy "Users can delete their own trips"
  on trips for delete
  using (auth.jwt() ->> 'email' = user_email);

-- =============================================================================
-- 4. INDEXES
-- =============================================================================
create index if not exists idx_profiles_username on profiles (username);
create index if not exists idx_friendships_requester on friendships (requester_email);
create index if not exists idx_friendships_addressee on friendships (addressee_email);
create index if not exists idx_trips_user_started on trips (user_email, started_at desc);

-- Reload PostgREST schema cache to immediately expose new columns to the client API
notify pgrst, 'reload schema';

