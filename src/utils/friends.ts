import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDemoMode, supabase } from './supabase';
import {
  UserProfile,
  Trip,
  DriverState,
  loadTripsForEmail,
  loadDriverStateForEmail,
  findUserByUsername,
  searchLocalUsersByUsername,
} from './storage';

// --- Types ---

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequestView {
  id: string;
  user: UserProfile; // the *other* person in the request
  status: FriendshipStatus;
  createdAt: number;
}

interface LocalFriendshipRecord {
  id: string;
  requesterEmail: string;
  addresseeEmail: string;
  status: FriendshipStatus;
  createdAt: number;
}

const FRIENDSHIPS_KEY = '@wheelrovo:friendships';

// --- Local (demo-mode) storage helpers ---

async function loadLocalFriendships(): Promise<LocalFriendshipRecord[]> {
  const json = await AsyncStorage.getItem(FRIENDSHIPS_KEY);
  return json ? JSON.parse(json) : [];
}

async function saveLocalFriendships(records: LocalFriendshipRecord[]): Promise<void> {
  await AsyncStorage.setItem(FRIENDSHIPS_KEY, JSON.stringify(records));
}

// --- Search ---

export async function searchUsers(query: string, currentUserEmail: string): Promise<UserProfile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (isDemoMode || !supabase) {
    return searchLocalUsersByUsername(trimmed, currentUserEmail);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('email, username, display_name, driver_type')
    .ilike('username', `%${trimmed}%`)
    .neq('email', currentUserEmail.trim().toLowerCase())
    .limit(20);

  if (error) {
    console.error('[friends] search error', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    name: row.display_name,
    email: row.email,
    username: row.username,
    driverType: row.driver_type,
  }));
}

// --- Send / respond to requests ---

export async function sendFriendRequest(
  currentUserEmail: string,
  targetUsername: string
): Promise<{ success: boolean; message: string }> {
  const requesterEmail = currentUserEmail.trim().toLowerCase();

  if (isDemoMode || !supabase) {
    const target = await findUserByUsername(targetUsername);
    if (!target) {
      return { success: false, message: 'No driver found with that username.' };
    }
    if (target.email === requesterEmail) {
      return { success: false, message: "You can't add yourself." };
    }

    const records = await loadLocalFriendships();
    const existing = records.find(
      (r) =>
        (r.requesterEmail === requesterEmail && r.addresseeEmail === target.email) ||
        (r.requesterEmail === target.email && r.addresseeEmail === requesterEmail)
    );
    if (existing) {
      return {
        success: false,
        message: existing.status === 'accepted' ? 'You are already friends.' : 'A request already exists.',
      };
    }

    records.push({
      id: `fr-${Date.now()}`,
      requesterEmail,
      addresseeEmail: target.email,
      status: 'pending',
      createdAt: Date.now(),
    });
    await saveLocalFriendships(records);
    return { success: true, message: `Friend request sent to @${target.username}.` };
  }

  // Real backend: look up the target's profile id by username, then insert
  // a pending friendship row. RLS ensures only the two involved users can
  // ever see this row (see supabase-schema.sql).
  const { data: target, error: findError } = await supabase
    .from('profiles')
    .select('id, email, username')
    .eq('username', targetUsername.trim().toLowerCase())
    .maybeSingle();

  if (findError || !target) {
    return { success: false, message: 'No driver found with that username.' };
  }

  const { error: insertError } = await supabase.from('friendships').insert({
    requester_email: requesterEmail,
    addressee_email: target.email,
    status: 'pending',
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, message: 'A request already exists.' };
    }
    console.error('[friends] request error', insertError.message);
    return { success: false, message: 'Could not send the request. Please try again.' };
  }

  return { success: true, message: `Friend request sent to @${target.username}.` };
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
  currentUserEmail?: string
): Promise<void> {
  if (isDemoMode || !supabase) {
    const records = await loadLocalFriendships();
    const updated = accept
      ? records.map((r) => (r.id === requestId ? { ...r, status: 'accepted' as FriendshipStatus } : r))
      : records.filter((r) => r.id !== requestId);
    await saveLocalFriendships(updated);
    return;
  }

  if (accept) {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
    if (error) console.error('[friends] accept error', error.message);
  } else {
    const { error } = await supabase.from('friendships').delete().eq('id', requestId);
    if (error) console.error('[friends] decline error', error.message);
  }
}

export async function removeFriend(friendshipId: string): Promise<void> {
  if (isDemoMode || !supabase) {
    const records = await loadLocalFriendships();
    await saveLocalFriendships(records.filter((r) => r.id !== friendshipId));
    return;
  }
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) console.error('[friends] remove error', error.message);
}

// --- Reading friend lists / requests ---

export async function getFriends(currentUserEmail: string): Promise<{ friendshipId: string; user: UserProfile }[]> {
  const email = currentUserEmail.trim().toLowerCase();

  if (isDemoMode || !supabase) {
    const records = await loadLocalFriendships();
    const accepted = records.filter(
      (r) => r.status === 'accepted' && (r.requesterEmail === email || r.addresseeEmail === email)
    );
    const results: { friendshipId: string; user: UserProfile }[] = [];
    for (const r of accepted) {
      const otherEmail = r.requesterEmail === email ? r.addresseeEmail : r.requesterEmail;
      const user = await findLocalUserByEmail(otherEmail);
      if (user) results.push({ friendshipId: r.id, user });
    }
    return results;
  }

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_email, addressee_email, requester:profiles!friendships_requester_email_fkey(email,username,display_name,driver_type), addressee:profiles!friendships_addressee_email_fkey(email,username,display_name,driver_type)')
    .eq('status', 'accepted')
    .or(`requester_email.eq.${email},addressee_email.eq.${email}`);

  if (error) {
    console.error('[friends] getFriends error', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const other = row.requester_email === email ? row.addressee : row.requester;
    return {
      friendshipId: row.id,
      user: {
        name: other.display_name,
        email: other.email,
        username: other.username,
        driverType: other.driver_type,
      } as UserProfile,
    };
  });
}

export async function getPendingRequests(
  currentUserEmail: string
): Promise<{ incoming: FriendRequestView[]; outgoing: FriendRequestView[] }> {
  const email = currentUserEmail.trim().toLowerCase();

  if (isDemoMode || !supabase) {
    const records = await loadLocalFriendships();
    const incoming: FriendRequestView[] = [];
    const outgoing: FriendRequestView[] = [];

    for (const r of records) {
      if (r.status !== 'pending') continue;
      if (r.addresseeEmail === email) {
        const user = await findLocalUserByEmail(r.requesterEmail);
        if (user) incoming.push({ id: r.id, user, status: r.status, createdAt: r.createdAt });
      } else if (r.requesterEmail === email) {
        const user = await findLocalUserByEmail(r.addresseeEmail);
        if (user) outgoing.push({ id: r.id, user, status: r.status, createdAt: r.createdAt });
      }
    }
    return { incoming, outgoing };
  }

  const { data, error } = await supabase
    .from('friendships')
    .select('id, status, created_at, requester_email, addressee_email, requester:profiles!friendships_requester_email_fkey(email,username,display_name,driver_type), addressee:profiles!friendships_addressee_email_fkey(email,username,display_name,driver_type)')
    .eq('status', 'pending')
    .or(`requester_email.eq.${email},addressee_email.eq.${email}`);

  if (error) {
    console.error('[friends] getPendingRequests error', error.message);
    return { incoming: [], outgoing: [] };
  }

  const incoming: FriendRequestView[] = [];
  const outgoing: FriendRequestView[] = [];
  for (const row of (data ?? []) as any[]) {
    const isIncoming = row.addressee_email === email;
    const other = isIncoming ? row.requester : row.addressee;
    const view: FriendRequestView = {
      id: row.id,
      user: {
        name: other.display_name,
        email: other.email,
        username: other.username,
        driverType: other.driver_type,
      },
      status: row.status,
      createdAt: new Date(row.created_at).getTime(),
    };
    (isIncoming ? incoming : outgoing).push(view);
  }
  return { incoming, outgoing };
}

// Local-only helper: look up a registered local account by email (as
// opposed to storage.ts's findUserByUsername, which matches on username).
async function findLocalUserByEmail(email: string): Promise<UserProfile | null> {
  const json = await AsyncStorage.getItem('@wheelrovo:registered_users');
  const users = json ? JSON.parse(json) : [];
  const match = users.find((u: any) => u.email === email);
  if (!match) return null;
  return { name: match.name, email: match.email, username: match.username, driverType: match.driverType };
}

/**
 * Pushes a completed trip's summary stats (not the route) to the remote
 * `trips` table so friends can see it in their feed once real Supabase is
 * wired up. No-op in demo mode — local trips already work there via
 * loadTripsForEmail, since that's device-local anyway.
 */
export async function pushTripSummary(trip: Trip, userEmail: string): Promise<void> {
  if (isDemoMode || !supabase) return;

  const { error } = await supabase.from('trips').insert({
    id: trip.id,
    user_email: userEmail.trim().toLowerCase(),
    started_at: new Date().toISOString(),
    duration_sec: trip.duration,
    distance_km: trip.distance,
    avg_speed_kmh: trip.avgSpeed,
    top_speed_kmh: trip.topSpeed ?? null,
    max_acceleration_ms2: trip.maxAccelerationMs2 ?? null,
    max_braking_ms2: trip.maxBrakingMs2 ?? null,
    avg_acceleration_ms2: trip.avgAccelerationMs2 ?? null,
    harsh_acceleration_events: trip.harshAccelerationEvents ?? null,
    harsh_braking_events: trip.harshBrakingEvents ?? null,
    safety_score: trip.safetyScore ?? null,
    smoothness_score: trip.smoothnessScore ?? null,
    comfort_score: trip.comfortScore ?? null,
  });

  if (error) {
    console.error('[friends] pushTripSummary error', error.message);
  }
}

/**
 * Pushes current XP/level to the remote `profiles` row so friends' Community
 * leaderboard can rank by it. No-op in demo mode (loadDriverStateForEmail
 * reads local storage directly there instead).
 */
export async function pushDriverStats(userEmail: string, state: DriverState): Promise<void> {
  if (isDemoMode || !supabase) return;

  const { error } = await supabase
    .from('profiles')
    .update({ xp: state.xp, level: state.level })
    .eq('email', userEmail.trim().toLowerCase());

  if (error) {
    console.error('[friends] pushDriverStats error', error.message);
  }
}

export interface LeaderboardEntry {
  user: UserProfile;
  isSelf: boolean;
  xp: number;
  level: number;
  totalDistanceKm: number;
}

/**
 * Ranking data for the current user plus their accepted friends. Demo mode
 * reads everything from local device storage (so it only reflects accounts
 * registered on this same device); real mode reads profiles.xp/level plus a
 * sum over the shared `trips` table, both gated by the same friendship RLS
 * used everywhere else.
 */
export async function getLeaderboard(currentUser: UserProfile): Promise<LeaderboardEntry[]> {
  const friends = await getFriends(currentUser.email);
  const people: UserProfile[] = [currentUser, ...friends.map((f) => f.user)];

  if (isDemoMode || !supabase) {
    const entries = await Promise.all(
      people.map(async (user) => {
        const [state, trips] = await Promise.all([
          loadDriverStateForEmail(user.email),
          loadTripsForEmail(user.email),
        ]);
        return {
          user,
          isSelf: user.email === currentUser.email,
          xp: state.xp,
          level: state.level,
          totalDistanceKm: trips.reduce((sum, t) => sum + t.distance, 0),
        };
      })
    );
    return entries;
  }

  const emails = people.map((p) => p.email);
  const [{ data: profileRows, error: profileError }, { data: tripRows, error: tripError }] = await Promise.all([
    supabase.from('profiles').select('email, xp, level').in('email', emails),
    supabase.from('trips').select('user_email, distance_km').in('user_email', emails),
  ]);

  if (profileError) console.error('[friends] leaderboard profiles error', profileError.message);
  if (tripError) console.error('[friends] leaderboard trips error', tripError.message);

  const distanceByEmail = new Map<string, number>();
  for (const row of (tripRows ?? []) as any[]) {
    distanceByEmail.set(row.user_email, (distanceByEmail.get(row.user_email) ?? 0) + row.distance_km);
  }
  const statsByEmail = new Map<string, { xp: number; level: number }>();
  for (const row of (profileRows ?? []) as any[]) {
    statsByEmail.set(row.email, { xp: row.xp ?? 0, level: row.level ?? 1 });
  }

  return people.map((user) => ({
    user,
    isSelf: user.email === currentUser.email,
    xp: statsByEmail.get(user.email)?.xp ?? 0,
    level: statsByEmail.get(user.email)?.level ?? 1,
    totalDistanceKm: distanceByEmail.get(user.email) ?? 0,
  }));
}

/**
 * Trip cards for a friend. In demo mode this only finds data if the friend's
 * account was registered on this same device (there's no shared server to
 * query) — real mode reads from the `trips` summary table, gated by the RLS
 * policy that only allows accepted friends to select another user's rows.
 */
export async function getFriendTrips(friendEmail: string): Promise<Trip[]> {
  if (isDemoMode || !supabase) {
    return loadTripsForEmail(friendEmail);
  }

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_email', friendEmail.trim().toLowerCase())
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[friends] getFriendTrips error', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    date: new Date(row.started_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    duration: row.duration_sec,
    distance: row.distance_km,
    avgSpeed: row.avg_speed_kmh,
    topSpeed: row.top_speed_kmh,
    coordinates: [], // route detail isn't fetched for the friend feed, only the summary card
    maxAccelerationMs2: row.max_acceleration_ms2,
    maxBrakingMs2: row.max_braking_ms2,
    avgAccelerationMs2: row.avg_acceleration_ms2,
    harshAccelerationEvents: row.harsh_acceleration_events,
    harshBrakingEvents: row.harsh_braking_events,
    safetyScore: row.safety_score,
    smoothnessScore: row.smoothness_score,
    comfortScore: row.comfort_score,
  }));
}
