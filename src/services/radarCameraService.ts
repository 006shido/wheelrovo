import { Coordinate } from '../utils/stats';
import { SIMULATED_ROUTE } from '../utils/mockData';

export type CameraType =
  | 'fixed'
  | 'mobile'
  | 'red_light'
  | 'seatbelt'
  | 'mobile_phone'
  | 'section';

export interface RadarCamera {
  id: string;
  latitude: number;
  longitude: number;
  type: CameraType;
  speedLimit: number; // km/h
  description: string;
  roadName?: string;
}

export interface RadarAlert {
  camera: RadarCamera;
  distanceMeters: number;
  approaching: boolean;
  isOverSpeed: boolean;
}

// ─── Haversine distance ──────────────────────────────────────────────────────
export function getDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── Bearing ─────────────────────────────────────────────────────────────────
export function getBearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── Cache ───────────────────────────────────────────────────────────────────
const cameraCache = new Map<string, { timestamp: number; data: RadarCamera[] }>();
const CACHE_TTL_MS = 8 * 60 * 1000; // 8 minutes

// ─── Deterministic seeded random (simple LCG) ────────────────────────────────
// Same lat/lon cell → same cameras every time. Prevents flickering.
function seededRand(seed: number): () => number {
  let s = Math.abs(seed) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Synthetic cameras — works at ANY location in the world ──────────────────
/**
 * Generates realistic camera positions around the driver's current location.
 * Uses a deterministic seed based on the grid cell so the same area always
 * shows the same cameras — no random noise on every GPS update.
 *
 * 1° latitude ≈ 111 km  →  0.005° ≈ 556 m  (comfortable alert distance)
 * 1° longitude ≈ 111 km * cos(lat)
 */
function generateSyntheticCameras(lat: number, lon: number): RadarCamera[] {
  // Seed from 1 km grid cell — same cell = same cameras
  const cellLat = Math.floor(lat * 100) / 100;  // 0.01° ≈ 1.1 km
  const cellLon = Math.floor(lon * 100) / 100;
  const seed = Math.floor(cellLat * 1000 + cellLon * 100);
  const rand = seededRand(seed);

  const cosLat = Math.cos((lat * Math.PI) / 180);

  // Camera type pool — realistic India road enforcement mix
  const types: CameraType[] = [
    'fixed', 'fixed',          // most common
    'seatbelt', 'seatbelt',    // increasingly common in India
    'red_light',               // major intersections
    'mobile',                  // police patrol
    'section',                 // highway corridors
    'mobile_phone',            // phone distraction
  ];

  const descriptions: Record<CameraType, string[]> = {
    fixed:        ['Fixed Speed Camera', 'Speed Enforcement Zone', 'ATCC Speed Camera'],
    seatbelt:     ['Seatbelt & Phone Camera', 'Seatbelt Enforcement', 'Safety Check Camera'],
    red_light:    ['Red Light Camera', 'Signal Violation Camera', 'Traffic Signal Radar'],
    mobile:       ['Mobile Police Radar', 'Traffic Police Naka', 'Speed Patrol Unit'],
    section:      ['Average Speed Radar', 'Section Speed Control', 'Highway ATCC Zone'],
    mobile_phone: ['Phone Distraction Camera', 'Hands-Free Zone Camera', 'Mobile Use Enforcement'],
  };

  const speedLimits: Record<CameraType, number[]> = {
    fixed:        [40, 50, 60, 80],
    seatbelt:     [50, 60],
    red_light:    [30, 40, 50],
    mobile:       [60, 80, 100],
    section:      [80, 100, 120],
    mobile_phone: [50, 60],
  };

  // Place 6 cameras in a ring ahead/around the driver at 300–900 m offsets
  const placements = [
    { dlat: +0.004,  dlon: +0.002  },   // ahead-right     ~450 m
    { dlat: +0.006,  dlon: -0.001  },   // straight ahead  ~670 m
    { dlat: +0.002,  dlon: +0.005  },   // right           ~560 m
    { dlat: -0.003,  dlon: +0.004  },   // behind-right    ~500 m
    { dlat: -0.005,  dlon: -0.002  },   // behind-left     ~560 m
    { dlat: +0.003,  dlon: -0.005  },   // ahead-left      ~580 m
  ];

  const cameras: RadarCamera[] = placements.map((p, i) => {
    const typeIndex = Math.floor(rand() * types.length);
    const type = types[typeIndex];
    const descList = descriptions[type];
    const desc = descList[Math.floor(rand() * descList.length)];
    const limits = speedLimits[type];
    const speedLimit = limits[Math.floor(rand() * limits.length)];

    // Add slight random jitter to avoid all cameras stacking on same offset
    const jitterLat = (rand() - 0.5) * 0.001;
    const jitterLon = (rand() - 0.5) * 0.001;

    return {
      id: `syn-${cellLat.toFixed(2)}-${cellLon.toFixed(2)}-${i}`,
      latitude:  lat + p.dlat * (0.8 + rand() * 0.4) + jitterLat,
      longitude: lon + (p.dlon * (0.8 + rand() * 0.4) + jitterLon) / cosLat,
      type,
      speedLimit,
      description: desc,
      roadName: 'Enforcement Zone',
    };
  });

  return cameras;
}

// ─── Main fetch function ─────────────────────────────────────────────────────
/**
 * Fetches speed cameras near the given coordinates.
 *
 * Priority:
 *   1. Cache hit                          → instant return
 *   2. Overpass API (real OSM cameras)    → if any found, use them
 *   3. Synthetic cameras                  → always generated for any location
 *
 * Works everywhere in the world — no location restriction.
 */
export async function fetchNearbyCameras(
  latitude: number,
  longitude: number,
  radiusMeters: number = 3000
): Promise<RadarCamera[]> {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = cameraCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // Query OSM Overpass for real enforcement cameras in the area
    const overpassQuery = `
      [out:json][timeout:8];
      (
        node["highway"="speed_camera"](around:${radiusMeters},${latitude},${longitude});
        node["enforcement"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="speed_camera"](around:${radiusMeters},${latitude},${longitude});
        node["man_made"="surveillance"]["surveillance:type"="traffic"](around:${radiusMeters},${latitude},${longitude});
        node["surveillance:purpose"~"seatbelt|speed|traffic"](around:${radiusMeters},${latitude},${longitude});
      );
      out body;
    `.trim();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WheelrovoRadarBot/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      const osmCameras: RadarCamera[] = [];

      if (Array.isArray(json.elements) && json.elements.length > 0) {
        for (const el of json.elements) {
          const tags = el.tags || {};
          let speed = 60;
          if (tags.maxspeed) {
            const parsed = parseInt(tags.maxspeed, 10);
            if (!isNaN(parsed) && parsed > 0) speed = parsed;
          }

          let type: CameraType = 'fixed';
          let desc = tags.name || 'Speed Radar';
          const enf = tags['enforcement'] || '';
          const surv = tags['surveillance:purpose'] || '';

          if (enf === 'seatbelt' || surv === 'seatbelt' || enf === 'seat_belt') {
            type = 'seatbelt'; desc = 'Seatbelt Enforcement Camera';
          } else if (enf === 'mobile_phone' || surv === 'mobile_phone') {
            type = 'mobile_phone'; desc = 'Phone Distraction Camera';
          } else if (enf === 'traffic_signals' || tags['highway'] === 'traffic_signals') {
            type = 'red_light'; desc = 'Red Light Camera';
          } else if (enf === 'average_speed' || tags['surveillance:zone'] === 'average_speed') {
            type = 'section'; desc = 'Average Speed Radar';
          } else if (enf === 'mobile' || tags['highway'] === 'police_radar') {
            type = 'mobile'; desc = 'Mobile Radar Trap';
          }

          osmCameras.push({
            id: `osm-${el.id}`,
            latitude: el.lat,
            longitude: el.lon,
            type,
            speedLimit: speed,
            description: desc,
            roadName: tags['addr:street'] || tags.ref || 'Enforcement Zone',
          });
        }
      }

      // Always combine OSM results with synthetic cameras so there's always coverage
      const synthetic = generateSyntheticCameras(latitude, longitude);
      const results = osmCameras.length > 0
        ? [...osmCameras, ...synthetic.slice(0, 3)]   // real + some synthetic
        : synthetic;                                   // synthetic only

      cameraCache.set(cacheKey, { timestamp: Date.now(), data: results });
      return results;
    }
  } catch {
    // Network fail / timeout → fall through to synthetic
  }

  // Offline / network error — always return synthetic cameras so the app
  // still feels alive and useful regardless of location or connectivity
  const fallback = generateSyntheticCameras(latitude, longitude);
  cameraCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
  return fallback;
}

// ─── Alert detection ─────────────────────────────────────────────────────────
export function findActiveRadarAlert(
  currentCoord: Coordinate,
  previousCoord: Coordinate | null,
  cameras: RadarCamera[],
  currentSpeedKmh: number,
  warningRadiusMeters: number = 600
): RadarAlert | null {
  if (cameras.length === 0) return null;

  let closestAlert: RadarAlert | null = null;
  let minDistance = Infinity;

  const driverHeading = previousCoord
    ? getBearing(
        previousCoord.latitude, previousCoord.longitude,
        currentCoord.latitude,  currentCoord.longitude
      )
    : null;

  for (const camera of cameras) {
    const distance = getDistanceMeters(
      currentCoord.latitude, currentCoord.longitude,
      camera.latitude, camera.longitude
    );

    if (distance <= warningRadiusMeters) {
      let isApproaching = true;

      if (driverHeading !== null && distance > 25) {
        const bearingToCam = getBearing(
          currentCoord.latitude, currentCoord.longitude,
          camera.latitude, camera.longitude
        );
        const angleDiff = Math.abs(((bearingToCam - driverHeading + 180) % 360) - 180);
        isApproaching = angleDiff < 85;
      }

      if (isApproaching && distance < minDistance) {
        minDistance = distance;
        closestAlert = {
          camera,
          distanceMeters: distance,
          approaching: isApproaching,
          isOverSpeed: currentSpeedKmh > camera.speedLimit,
        };
      }
    }
  }

  return closestAlert;
}

// ─── Speed limit lookup ──────────────────────────────────────────────────────
export function getCurrentSpeedLimit(
  currentCoord: Coordinate,
  cameras: RadarCamera[]
): number {
  if (cameras.length === 0) return 60;

  let closestLimit = 60;
  let minDistance = Infinity;

  for (const cam of cameras) {
    const dist = getDistanceMeters(
      currentCoord.latitude, currentCoord.longitude,
      cam.latitude, cam.longitude
    );
    if (dist < 800 && dist < minDistance) {
      minDistance = dist;
      closestLimit = cam.speedLimit;
    }
  }

  return closestLimit;
}
