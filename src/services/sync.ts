import { AppState, AppStateStatus } from 'react-native';
import { supabase, isDemoMode } from '../utils/supabase';
import { getUnsyncedPoints, markPointsSynced, DbTripPointRow } from './db';

// Push-based sync: local SQLite is always the source of truth for "did we
// capture this point." Sync only ever moves data forward (local -> remote)
// in batches, and never blocks tracking on network availability — a drive
// through a dead zone should never lose points, just delay their upload.

const BATCH_SIZE = 200;
const PERIODIC_SYNC_INTERVAL_MS = 45 * 1000;

let syncTimer: ReturnType<typeof setInterval> | null = null;
let syncInFlight = false;

function toRemoteShape(userId: string, point: DbTripPointRow) {
  return {
    // Client-generated composite key so retried batches after a partial
    // network failure upsert instead of creating duplicate rows.
    client_id: `${point.trip_id}:${point.id}`,
    trip_id: point.trip_id,
    user_id: userId,
    latitude: point.latitude,
    longitude: point.longitude,
    speed: point.speed,
    accuracy: point.accuracy,
    timestamp: point.timestamp,
  };
}

export async function syncPendingPoints(userId: string): Promise<{ synced: number; error?: string }> {
  if (isDemoMode || !supabase) {
    // No backend configured — points stay buffered locally until it is.
    return { synced: 0 };
  }
  if (syncInFlight) {
    return { synced: 0 };
  }

  syncInFlight = true;
  try {
    const pending = await getUnsyncedPoints(BATCH_SIZE);
    if (pending.length === 0) {
      return { synced: 0 };
    }

    const { error } = await supabase
      .from('trip_points')
      .upsert(pending.map((p) => toRemoteShape(userId, p)), { onConflict: 'client_id' });

    if (error) {
      console.error('[sync] upload failed', error.message);
      return { synced: 0, error: error.message };
    }

    await markPointsSynced(pending.map((p) => p.id));
    return { synced: pending.length };
  } finally {
    syncInFlight = false;
  }
}

/**
 * Starts a lightweight periodic sync loop plus an app-foreground trigger.
 * Call once (e.g. from App.tsx) after the user is authenticated; call
 * stopPeriodicSync() on logout.
 */
export function startPeriodicSync(userId: string): () => void {
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  syncTimer = setInterval(() => {
    syncPendingPoints(userId);
  }, PERIODIC_SYNC_INTERVAL_MS);

  const onAppStateChange = (state: AppStateStatus) => {
    if (state === 'active') {
      syncPendingPoints(userId);
    }
  };
  const subscription = AppState.addEventListener('change', onAppStateChange);

  // Kick off one immediately rather than waiting for the first interval tick.
  syncPendingPoints(userId);

  return () => {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
    subscription.remove();
  };
}
