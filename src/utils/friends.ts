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
  getCurrentUser,
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
  const cleanQuery = trimmed.replace(/^@/, '');

  if (isDemoMode || !supabase) {
    return searchLocalUsersByUsername(cleanQuery, currentUserEmail);
  }

  // Attempt to query with is_private, searching both username and display_name
  let res: any = await supabase
    .from('profiles')
    .select('email, username, display_name, driver_type, xp, level, is_private')
    .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
    .neq('email', currentUserEmail.trim().toLowerCase())
    .limit(20);

  // If is_private column does not exist yet in Supabase schema, gracefully fallback without it
  if (res.error && res.error.message?.includes('is_private')) {
    res = await supabase
      .from('profiles')
      .select('email, username, display_name, driver_type, xp, level')
      .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
      .neq('email', currentUserEmail.trim().toLowerCase())
      .limit(20);
  }

  if (res.error) {
    console.error('[friends] search error', res.error.message);
    return [];
  }

  return (res.data ?? []).map((row: any) => ({
    name: row.display_name,
    email: row.email,
    username: row.username,
    driverType: row.driver_type,
    xp: row.xp ?? 0,
    level: row.level ?? 1,
    isPrivate: row.is_private !== false,
  }));
}

/**
 * Ensures a row exists in Supabase `profiles` for the given email.
 * If the user logged in directly with password or signed up without hitting
 * the email-link callback, this self-heals their missing profile so foreign-key
 * constraints on `friendships` and `trips` succeed.
 */
export async function ensureRemoteProfile(userEmail: string): Promise<boolean> {
  if (isDemoMode || !supabase) return true;

  const email = userEmail.trim().toLowerCase();

  try {
    // 1. Check if profile already exists in Supabase
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existing) return true;

    // 2. Fetch authenticated user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      console.warn('[friends] Cannot ensure profile: No authenticated Supabase user');
      return false;
    }

    const localUser = await getCurrentUser();
    const fallbackUsername = (email.split('@')[0] || 'driver').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const username = localUser?.username || user.user_metadata?.username || fallbackUsername;
    const displayName = localUser?.name || user.user_metadata?.display_name || email.split('@')[0] || 'Driver';
    const driverType = localUser?.driverType || user.user_metadata?.driver_type || 'Casual';
    const isPrivate = localUser?.isPrivate ?? true;

    const profilePayload: any = {
      id: user.id,
      email,
      username,
      display_name: displayName,
      driver_type: driverType,
      is_private: isPrivate,
    };

    let { error: upsertError } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });

    // If is_private does not exist yet in Supabase table, retry without it
    if (upsertError && upsertError.message?.includes('is_private')) {
      delete profilePayload.is_private;
      const retry = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
      upsertError = retry.error;
    }

    if (upsertError) {
      console.error('[friends] ensureRemoteProfile upsert failed:', upsertError.message);
      // If username was already taken, append random digits
      if (upsertError.code === '23505') {
        const uniqueUsername = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
        profilePayload.username = uniqueUsername;
        await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' });
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error('[friends] ensureRemoteProfile unexpected error:', err);
    return false;
  }
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

  // Make sure the requester's profile exists in profiles table before inserting
  await ensureRemoteProfile(requesterEmail);

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

  let res: any = await supabase
    .from('friendships')
    .select('id, requester_email, addressee_email, requester:profiles!friendships_requester_email_fkey(email,username,display_name,driver_type,is_private), addressee:profiles!friendships_addressee_email_fkey(email,username,display_name,driver_type,is_private)')
    .eq('status', 'accepted')
    .or(`requester_email.eq.${email},addressee_email.eq.${email}`);

  // Fallback if is_private does not exist yet in profiles table
  if (res.error && res.error.message?.includes('is_private')) {
    res = await supabase
      .from('friendships')
      .select('id, requester_email, addressee_email, requester:profiles!friendships_requester_email_fkey(email,username,display_name,driver_type), addressee:profiles!friendships_addressee_email_fkey(email,username,display_name,driver_type)')
      .eq('status', 'accepted')
      .or(`requester_email.eq.${email},addressee_email.eq.${email}`);
  }

  if (res.error) {
    console.error('[friends] getFriends error', res.error.message);
    return [];
  }

  return (res.data ?? []).map((row: any) => {
    const other = row.requester_email === email ? row.addressee : row.requester;
    if (!other) return null;
    return {
      friendshipId: row.id,
      user: {
        name: other.display_name,
        email: other.email,
        username: other.username,
        driverType: other.driver_type,
        isPrivate: other.is_private !== false,
      } as UserProfile,
    };
  }).filter(Boolean) as { friendshipId: string; user: UserProfile }[];
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

  let res: any = await supabase
    .from('friendships')
    .select('id, status, created_at, requester_email, addressee_email, requester:profiles!friendships_requester_email_fkey(email,username,display_name,driver_type,is_private), addressee:profiles!friendships_addressee_email_fkey(email,username,display_name,driver_type,is_private)')
    .eq('status', 'pending')
    .or(`requester_email.eq.${email},addressee_email.eq.${email}`);

  // Fallback if is_private does not exist yet in profiles table
  if (res.error && res.error.message?.includes('is_private')) {
    res = await supabase
      .from('friendships')
      .select('id, status, created_at, requester_email, addressee_email, requester:profiles!friendships_requester_email_fkey(email,username,display_name,driver_type), addressee:profiles!friendships_addressee_email_fkey(email,username,display_name,driver_type)')
      .eq('status', 'pending')
      .or(`requester_email.eq.${email},addressee_email.eq.${email}`);
  }

  if (res.error) {
    console.error('[friends] getPendingRequests error', res.error.message);
    return { incoming: [], outgoing: [] };
  }

  const incoming: FriendRequestView[] = [];
  const outgoing: FriendRequestView[] = [];
  for (const row of (res.data ?? []) as any[]) {
    const isIncoming = row.addressee_email === email;
    const other = isIncoming ? row.requester : row.addressee;
    if (!other) continue;
    const view: FriendRequestView = {
      id: row.id,
      user: {
        name: other.display_name,
        email: other.email,
        username: other.username,
        driverType: other.driver_type,
        isPrivate: other.is_private !== false,
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
  return {
    name: match.name,
    email: match.email,
    username: match.username,
    driverType: match.driverType,
    isPrivate: match.isPrivate ?? true,
  };
}

/**
 * Pushes a completed trip's summary stats AND route coordinates to the remote
 * `trips` table so accepted friends can see it with the map in their feed.
 */
export async function pushTripSummary(trip: Trip, userEmail: string): Promise<void> {
  if (isDemoMode || !supabase) return;

  const { error } = await supabase.from('trips').upsert({
    id: trip.id,
    user_email: userEmail.trim().toLowerCase(),
    started_at: new Date().toISOString(),
    duration_sec: trip.duration,
    distance_km: trip.distance,
    avg_speed_kmh: trip.avgSpeed,
    top_speed_kmh: trip.topSpeed ?? null,
    coordinates: trip.coordinates ?? [],
    max_acceleration_ms2: trip.maxAccelerationMs2 ?? null,
    max_braking_ms2: trip.maxBrakingMs2 ?? null,
    avg_acceleration_ms2: trip.avgAccelerationMs2 ?? null,
    harsh_acceleration_events: trip.harshAccelerationEvents ?? null,
    harsh_braking_events: trip.harshBrakingEvents ?? null,
    safety_score: trip.safetyScore ?? null,
    smoothness_score: trip.smoothnessScore ?? null,
    comfort_score: trip.comfortScore ?? null,
  }, { onConflict: 'id' });

  if (error) {
    console.error('[friends] pushTripSummary error', error.message);
  }
}

/**
 * Backfills any local trips' GPS coordinates to Supabase so existing drives
 * have their driven route maps populated for friends in Community.
 */
export async function syncLocalTripsToRemote(userEmail: string): Promise<void> {
  if (isDemoMode || !supabase) return;
  const email = userEmail.trim().toLowerCase();
  const localTrips = await loadTripsForEmail(email);

  for (const trip of localTrips) {
    if (trip.coordinates && trip.coordinates.length > 0) {
      await supabase
        .from('trips')
        .upsert({
          id: trip.id,
          user_email: email,
          started_at: new Date().toISOString(),
          duration_sec: trip.duration,
          distance_km: trip.distance,
          avg_speed_kmh: trip.avgSpeed,
          top_speed_kmh: trip.topSpeed ?? null,
          coordinates: trip.coordinates,
          max_acceleration_ms2: trip.maxAccelerationMs2 ?? null,
          max_braking_ms2: trip.maxBrakingMs2 ?? null,
          avg_acceleration_ms2: trip.avgAccelerationMs2 ?? null,
          harsh_acceleration_events: trip.harshAccelerationEvents ?? null,
          harsh_braking_events: trip.harshBrakingEvents ?? null,
          safety_score: trip.safetyScore ?? null,
          smoothness_score: trip.smoothnessScore ?? null,
          comfort_score: trip.comfortScore ?? null,
        }, { onConflict: 'id' });
    }
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
 * query) — real mode reads from the `trips` table, gated by the RLS
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
    coordinates: Array.isArray(row.coordinates) ? row.coordinates : [],
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

export async function pushUserPrivacy(userEmail: string, isPrivate: boolean): Promise<void> {
  if (isDemoMode || !supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ is_private: isPrivate })
    .eq('email', userEmail.trim().toLowerCase());
  if (error) {
    if (error.message?.includes('is_private')) {
      console.warn('[friends] pushUserPrivacy: is_private column not yet in Supabase schema. Run migration in Supabase SQL Editor.');
    } else {
      console.error('[friends] pushUserPrivacy error:', error.message);
    }
  }
}

export interface DriverPreviewData {
  trips: Trip[];
  totalDistanceKm: number;
  totalTrips: number;
  avgSafetyScore: number | null;
  isPrivate: boolean;
}

/**
 * Loads a driver's public profile stats and recent trip summaries.
 * - For Private Profiles: GPS route coordinates are stripped/omitted to protect driver
 *   privacy until a friend request is accepted.
 * - For Public Profiles: Driven route maps and GPS coordinates are publicly available.
 */
export async function getDriverPreview(driverEmail: string, knownIsPrivate?: boolean): Promise<DriverPreviewData> {
  const email = driverEmail.trim().toLowerCase();
  let isPrivate = knownIsPrivate;

  if (isDemoMode || !supabase) {
    if (isPrivate === undefined) {
      const targetUser = await findLocalUserByEmail(email);
      isPrivate = targetUser ? (targetUser as any).isPrivate !== false : true;
    }

    const rawTrips = await loadTripsForEmail(email);
    const sanitizedTrips: Trip[] = rawTrips.map((t) => ({
      ...t,
      // If private profile: omit coordinates. If public profile: keep coordinates!
      coordinates: isPrivate ? [] : (t.coordinates ?? []),
    }));

    const totalDistanceKm = rawTrips.reduce((acc, t) => acc + (t.distance || 0), 0);
    const scoredTrips = rawTrips.filter((t) => t.safetyScore != null);
    const avgSafetyScore =
      scoredTrips.length > 0
        ? Math.round(scoredTrips.reduce((acc, t) => acc + (t.safetyScore || 0), 0) / scoredTrips.length)
        : null;

    return {
      trips: sanitizedTrips.slice(0, 5),
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalTrips: rawTrips.length,
      avgSafetyScore,
      isPrivate,
    };
  }

  // Supabase mode: determine privacy if not provided
  if (isPrivate === undefined) {
    const { data: prof, error: profError } = await supabase
      .from('profiles')
      .select('is_private')
      .eq('email', email)
      .maybeSingle();
    if (profError) {
      isPrivate = true; // safe fallback
    } else {
      isPrivate = prof ? prof.is_private !== false : true;
    }
  }

  // If public, query coordinates column; if private, omit coordinates from query
  const selectCols = isPrivate
    ? 'id, started_at, duration_sec, distance_km, avg_speed_kmh, top_speed_kmh, safety_score, smoothness_score, comfort_score'
    : 'id, started_at, duration_sec, distance_km, avg_speed_kmh, top_speed_kmh, coordinates, safety_score, smoothness_score, comfort_score';

  const { data, error } = await supabase
    .from('trips')
    .select(selectCols)
    .eq('user_email', email)
    .order('started_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[friends] getDriverPreview error', error.message);
    return { trips: [], totalDistanceKm: 0, totalTrips: 0, avgSafetyScore: null, isPrivate };
  }

  const trips: Trip[] = (data ?? []).map((row: any) => ({
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
    coordinates: isPrivate ? [] : (Array.isArray(row.coordinates) ? row.coordinates : []),
    safetyScore: row.safety_score,
    smoothnessScore: row.smoothness_score,
    comfortScore: row.comfort_score,
  }));

  const totalDistanceKm = trips.reduce((acc, t) => acc + (t.distance || 0), 0);
  const scoredTrips = trips.filter((t) => t.safetyScore != null);
  const avgSafetyScore =
    scoredTrips.length > 0
      ? Math.round(scoredTrips.reduce((acc, t) => acc + (t.safetyScore || 0), 0) / scoredTrips.length)
      : null;

  return {
    trips,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalTrips: trips.length,
    avgSafetyScore,
    isPrivate,
  };
}

