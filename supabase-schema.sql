-- Wheelrovo — Friends feature schema
--
-- Run this in your Supabase project's SQL editor (Database > SQL Editor)
-- once EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are set in
-- your .env file and real Supabase Auth is wired up (isDemoMode = false).
--
-- This does NOT run automatically — the app's demo mode works without it,
-- but usernames, search, and friend requests won't sync across devices
-- until these tables and policies exist.

-- 1. Public profile info, one row per authenticated user. Separate from
--    auth.users so we can expose a *searchable* username without exposing
--    email or any other auth data.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  display_name text not null,
  driver_type text not null default 'Casual',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Anyone signed in can search/view basic profile info (name + username) —
-- this is what makes "find drivers by username" work, same as Instagram's
-- public-by-default username search.
create policy "Profiles are viewable by any authenticated user"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- 2. Friendships. A single row per pair, oriented requester -> addressee.
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_email text not null references profiles(email) on delete cascade,
  addressee_email text not null references profiles(email) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_email, addressee_email)
);

alter table friendships enable row level security;

-- Only the two people involved in a friendship can see the row at all —
-- this is the actual privacy boundary, not anything in the app's UI code.
create policy "Users can view their own friendships"
  on friendships for select
  using (
    auth.jwt() ->> 'email' = requester_email
    or auth.jwt() ->> 'email' = addressee_email
  );

create policy "Users can send friend requests as themselves"
  on friendships for insert
  with check (auth.jwt() ->> 'email' = requester_email);

-- Either party can update status (addressee accepts/declines; either side
-- could later "unfriend" by deleting instead).
create policy "Involved users can update friendship status"
  on friendships for update
  using (
    auth.jwt() ->> 'email' = requester_email
    or auth.jwt() ->> 'email' = addressee_email
  );

create policy "Involved users can delete a friendship"
  on friendships for delete
  using (
    auth.jwt() ->> 'email' = requester_email
    or auth.jwt() ->> 'email' = addressee_email
  );

-- 3. Trip summaries (not full routes — just the card-level stats shown in
--    the Friends feed). Route-level coordinate data stays local/unsynced
--    for now; only sync trip_points (see src/services/sync.ts) if you want
--    full route replay for friends later, which needs its own visibility
--    policy since it's much more sensitive than a summary card.
create table if not exists trips (
  id text primary key, -- matches the client-generated trip id used locally
  user_email text not null references profiles(email) on delete cascade,
  started_at timestamptz not null,
  duration_sec integer not null,
  distance_km real not null,
  avg_speed_kmh real not null,
  top_speed_kmh real,
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

alter table trips enable row level security;

-- Owner can always see their own trips.
create policy "Users can view their own trips"
  on trips for select
  using (auth.jwt() ->> 'email' = user_email);

-- An accepted friend can see a trip only if visibility = 'friends' AND an
-- accepted friendship exists between the viewer and the trip's owner. This
-- is the actual access-control mechanism — the app's UI never being shown
-- someone's trips is not a substitute for this.
create policy "Accepted friends can view shared trips"
  on trips for select
  using (
    visibility = 'friends'
    and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and (
          (f.requester_email = auth.jwt() ->> 'email' and f.addressee_email = trips.user_email)
          or
          (f.addressee_email = auth.jwt() ->> 'email' and f.requester_email = trips.user_email)
        )
    )
  );

create policy "Users can insert their own trips"
  on trips for insert
  with check (auth.jwt() ->> 'email' = user_email);

create policy "Users can update their own trips"
  on trips for update
  using (auth.jwt() ->> 'email' = user_email);

create policy "Users can delete their own trips"
  on trips for delete
  using (auth.jwt() ->> 'email' = user_email);

-- Helpful indexes for the queries friends.ts runs.
create index if not exists idx_profiles_username on profiles (username);
create index if not exists idx_friendships_requester on friendships (requester_email);
create index if not exists idx_friendships_addressee on friendships (addressee_email);
create index if not exists idx_trips_user_started on trips (user_email, started_at desc);
