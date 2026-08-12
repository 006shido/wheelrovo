import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  createTrip,
  getActiveTrip,
  completeTrip,
  abandonTrip,
  insertTripPoint,
  getLastPointForTrip,
  getPointsForTrip,
} from './db';

export const LOCATION_TASK_NAME = 'wheelrovo-background-location';

// Reconciliation threshold: if the active trip's last point is older than this,
// on app launch we assume the OS silently killed background execution rather
// than the user forgetting to press Stop, and we close the trip out instead of
// leaving it "active" forever.
const STALE_TRIP_THRESHOLD_MS = 5 * 60 * 1000;

// NOTE: this callback can run in a headless JS context on Android when the app
// is fully backgrounded/killed, so it must not depend on React state or any
// in-memory module variable set by the UI — it reads/writes only through the
// SQLite layer, which is safe to touch from either context.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data: any; error: any }) => {
  if (error) {
    console.error('[locationTask] task error', error);
    return;
  }
  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const activeTrip = await getActiveTrip();
  if (!activeTrip) {
    // No active trip (e.g. race between stop-tracking and a final delivered
    // batch) — drop the points rather than attaching them to nothing.
    return;
  }

  for (const loc of locations) {
    await insertTripPoint(activeTrip.id, {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: loc.coords.speed,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    });
  }
});

export async function requestBackgroundLocationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;

  // iOS requires foreground permission to be granted first, then a separate
  // background prompt; Android 10+ has the same two-step flow.
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

export async function startBackgroundTracking(tripId: string, userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  await createTrip(tripId, userId);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 3000,
    distanceInterval: 10, // meters — avoids flooding storage while stopped at lights
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true, // iOS: honest "still tracking" blue bar
    foregroundService: {
      notificationTitle: 'Wheelrovo is tracking your drive',
      notificationBody: 'Tap to return to the app',
      notificationColor: '#1E88E5',
    },
  });
}

export async function stopBackgroundTracking(tripId: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
  await completeTrip(tripId);
}

/**
 * Call on app launch (before rendering trip UI). If a trip was left "active"
 * because the process was killed mid-trip, this closes it out using the last
 * point that actually made it to SQLite, instead of leaving a phantom active
 * trip that blocks starting a new one — or silently losing what was captured.
 */
export async function reconcileTripsOnLaunch(): Promise<void> {
  if (Platform.OS === 'web') return;

  const activeTrip = await getActiveTrip();
  if (!activeTrip) return;

  const lastPoint = await getLastPointForTrip(activeTrip.id);
  const lastTimestamp = lastPoint?.timestamp ?? activeTrip.started_at;
  const staleFor = Date.now() - lastTimestamp;

  if (staleFor > STALE_TRIP_THRESHOLD_MS) {
    // Background execution was almost certainly killed by the OS. Close the
    // trip out with whatever points we have rather than leaving it dangling.
    await abandonTrip(activeTrip.id, lastPoint?.timestamp ?? null);
    return;
  }

  // Recent activity — the background task registration should still be live
  // (expo-location re-registers it after app restarts), so just leave it be.
}

export async function getTripCoordinates(tripId: string) {
  const points = await getPointsForTrip(tripId);
  return points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    timestamp: p.timestamp,
  }));
}
