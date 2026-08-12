import * as SQLite from 'expo-sqlite';

// Local durable store for in-progress and completed trips.
//
// Why SQLite instead of AsyncStorage: AsyncStorage is a flat key-value store —
// every write serializes the *entire* value. For a trip that accumulates GPS
// points over minutes/hours, that means re-serializing a growing JSON array on
// every single point, which gets slow and is not safe against partial writes.
// SQLite gives us one row per point, real incremental writes, and a place for
// the background location task to write into even while the JS/React tree is
// not mounted.

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
  synced: number; // 0 | 1
}

const DB_NAME = 'wheelrovo.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Single shared connection, lazily opened and migrated once.
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db: SQLite.SQLiteDatabase) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS trips (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          status TEXT NOT NULL DEFAULT 'active',
          sync_status TEXT NOT NULL DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS trip_points (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id TEXT NOT NULL REFERENCES trips(id),
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          speed REAL,
          accuracy REAL,
          timestamp INTEGER NOT NULL,
          synced INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_trip_points_trip_id ON trip_points(trip_id);
        CREATE INDEX IF NOT EXISTS idx_trip_points_synced ON trip_points(synced);
        CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
      `);
      return db;
    });
  }
  // Non-null: the branch above always assigns dbPromise when it was null,
  // so it is guaranteed to be set by this point.
  return dbPromise!;
}

// --- Trips ---

export async function createTrip(tripId: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO trips (id, user_id, started_at, status, sync_status) VALUES (?, ?, ?, 'active', 'pending')`,
    tripId,
    userId,
    Date.now()
  );
}

export async function getActiveTrip(): Promise<DbTripRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DbTripRow>(
    `SELECT * FROM trips WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`
  );
  return row ?? null;
}

export async function completeTrip(tripId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE trips SET status = 'completed', ended_at = ? WHERE id = ?`,
    Date.now(),
    tripId
  );
}

export async function abandonTrip(tripId: string, lastKnownTimestamp: number | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE trips SET status = 'abandoned', ended_at = ? WHERE id = ?`,
    lastKnownTimestamp ?? Date.now(),
    tripId
  );
}

// --- Trip points ---

export async function insertTripPoint(
  tripId: string,
  point: { latitude: number; longitude: number; speed: number | null; accuracy: number | null; timestamp: number }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO trip_points (trip_id, latitude, longitude, speed, accuracy, timestamp, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    tripId,
    point.latitude,
    point.longitude,
    point.speed,
    point.accuracy,
    point.timestamp
  );
}

export async function getPointsForTrip(tripId: string): Promise<DbTripPointRow[]> {
  const db = await getDb();
  return db.getAllAsync<DbTripPointRow>(
    `SELECT * FROM trip_points WHERE trip_id = ? ORDER BY timestamp ASC`,
    tripId
  );
}

export async function getLastPointForTrip(tripId: string): Promise<DbTripPointRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DbTripPointRow>(
    `SELECT * FROM trip_points WHERE trip_id = ? ORDER BY timestamp DESC LIMIT 1`,
    tripId
  );
  return row ?? null;
}

export async function getUnsyncedPoints(limit = 200): Promise<DbTripPointRow[]> {
  const db = await getDb();
  return db.getAllAsync<DbTripPointRow>(
    `SELECT * FROM trip_points WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?`,
    limit
  );
}

export async function markPointsSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`UPDATE trip_points SET synced = 1 WHERE id IN (${placeholders})`, ...ids);
}
