// Web build of the trip/trip_points store. expo-sqlite's web support needs
// extra Metro config to bundle its .wasm file, which this project doesn't
// have set up — and there's no need to, since every caller of this module
// (locationTask.ts, sync.ts, TrackingScreen's reconciliation) is already
// part of the background-tracking feature that's native-only and no-ops on
// web via Platform.OS checks. Metro picks this file automatically instead
// of db.ts when bundling for web (the .web.ts extension), so the real
// expo-sqlite import in db.ts is never even reached on this platform.
//
// Every function here mirrors db.ts's signatures and safely no-ops/returns
// empty results — callers already handle "no local data found" gracefully
// (e.g. TrackingScreen falls back to its in-memory route state).

export interface DbTripRow {
  id: string;
  user_id: string;
  started_at: number;
  ended_at: number | null;
  status: 'active' | 'completed' | 'abandoned';
  sync_status: 'pending' | 'synced' | 'failed';
}

export interface DbTripPointRow {
  id: number;
  trip_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
  synced: number;
}

export async function createTrip(_tripId: string, _userId: string): Promise<void> {}

export async function getActiveTrip(): Promise<DbTripRow | null> {
  return null;
}

export async function completeTrip(_tripId: string): Promise<void> {}

export async function abandonTrip(_tripId: string, _lastKnownTimestamp: number | null): Promise<void> {}

export async function insertTripPoint(
  _tripId: string,
  _point: { latitude: number; longitude: number; speed: number | null; accuracy: number | null; timestamp: number }
): Promise<void> {}

export async function getPointsForTrip(_tripId: string): Promise<DbTripPointRow[]> {
  return [];
}

export async function getLastPointForTrip(_tripId: string): Promise<DbTripPointRow | null> {
  return null;
}

export async function getUnsyncedPoints(_limit = 200): Promise<DbTripPointRow[]> {
  return [];
}

export async function markPointsSynced(_ids: number[]): Promise<void> {}
