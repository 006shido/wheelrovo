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

-- Ensure columns exist if table was already created
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
-- (Only creates profiles when email is confirmed by clicking the link)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only create a profile once the user has verified/confirmed their email!
  if new.email_confirmed_at is not null then
    insert into public.profiles (id, email, username, display_name, driver_type, is_private)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'username', lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))),
      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
      coalesce(new.raw_user_meta_data->>'driver_type', 'Casual'),
      coalesce((new.raw_user_meta_data->>'is_private')::boolean, true)
    )
    on conflict (id) do update set
      email = excluded.email,
      username = coalesce(public.profiles.username, excluded.username),
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      driver_type = coalesce(public.profiles.driver_type, excluded.driver_type);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_confirmed on auth.users;

-- Triggers on both insert (if auto-confirmed/OAuth) and update (when email link is clicked)
create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute procedure public.handle_new_user();

-- Delete any existing unconfirmed test/pending profiles from the public database (removes testdriver12345)
delete from public.profiles
where id in (
  select id from auth.users where email_confirmed_at is null
);

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
  id text primary key,
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

-- Ensure coordinates exists if table was already created
alter table trips add column if not exists coordinates jsonb default '[]'::jsonb;

alter table trips enable row level security;

drop policy if exists "Users can view their own trips" on trips;
create policy "Users can view their own trips"
  on trips for select
  using (auth.jwt() ->> 'email' = user_email);

-- Allow authenticated users to view trips for public driver previews & community
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
-- 4. INDEXES & CACHE RELOAD
-- =============================================================================
create index if not exists idx_profiles_username on profiles (username);
create index if not exists idx_profiles_xp on profiles (xp desc);
create index if not exists idx_friendships_requester on friendships (requester_email);
create index if not exists idx_friendships_addressee on friendships (addressee_email);
create index if not exists idx_trips_user_started on trips (user_email, started_at desc);

notify pgrst, 'reload schema';
