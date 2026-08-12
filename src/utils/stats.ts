export interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
  speedKmh?: number; // instantaneous speed at this point, when available from GPS
}

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * Returns distance in kilometers (km)
 */
export function getDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(coord2.latitude - coord1.latitude);
  const dLon = deg2rad(coord2.longitude - coord1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.latitude)) *
      Math.cos(deg2rad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Computes the total distance of a route (array of coordinates) in km
 */
export function calculateRouteDistance(coordinates: Coordinate[]): number {
  if (coordinates.length < 2) return 0;
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalDistance += getDistance(coordinates[i], coordinates[i + 1]);
  }
  return totalDistance;
}

/**
 * Formats time in seconds to HH:MM:SS or MM:SS format
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
}

/**
 * Formats speed from meters/sec or km/h into clean strings
 */
export function formatSpeed(speedKmh: number): string {
  if (isNaN(speedKmh) || speedKmh < 0) return '0.0';
  return speedKmh.toFixed(1);
}

/**
 * Formats distance in km
 */
export function formatDistance(distanceKm: number): string {
  if (isNaN(distanceKm) || distanceKm < 0) return '0.00';
  return distanceKm.toFixed(2);
}

/**
 * Formats acceleration in m/s^2 to a clean string, e.g. "2.3"
 */
export function formatAcceleration(accelerationMs2: number): string {
  if (isNaN(accelerationMs2)) return '0.0';
  return accelerationMs2.toFixed(1);
}

// --- Acceleration & driving-performance scoring ---
//
// These thresholds and score formulas are a simple heuristic starting point,
// not a calibrated industry standard (real usage-based-insurance telematics
// tune these against large fleets of labeled driving data). They're useful
// for giving drivers relative, directional feedback trip-to-trip, not for
// anything like an authoritative safety rating.

// A sample of acceleration between two consecutive GPS points.
export interface AccelerationSample {
  accelerationMs2: number; // signed: positive = speeding up, negative = braking
  timestamp: number;
}

// Harsh-event thresholds, roughly in line with common telematics defaults
// (~0.25-0.3g). Positive = accelerating hard; negative = braking hard.
export const HARSH_ACCEL_THRESHOLD_MS2 = 2.5;
export const HARSH_BRAKE_THRESHOLD_MS2 = -3.0;

/**
 * Derives per-interval acceleration (m/s^2) from consecutive coordinates'
 * speed and timestamps. Points missing a speed reading are skipped rather
 * than guessing, since interpolating speed from position deltas alone is
 * much noisier than the GPS chip's own Doppler-based speed estimate.
 */
export function calculateAccelerationSeries(coordinates: Coordinate[]): AccelerationSample[] {
  const samples: AccelerationSample[] = [];
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    if (prev.speedKmh == null || curr.speedKmh == null) continue;

    const dtSec = (curr.timestamp - prev.timestamp) / 1000;
    if (dtSec <= 0) continue;

    const dvMs = (curr.speedKmh - prev.speedKmh) / 3.6; // km/h -> m/s
    samples.push({ accelerationMs2: dvMs / dtSec, timestamp: curr.timestamp });
  }
  return samples;
}

export interface TripPerformance {
  maxAccelerationMs2: number; // peak speeding-up rate
  maxBrakingMs2: number; // peak slowing-down rate, reported as a positive magnitude
  avgAccelerationMs2: number; // average magnitude of acceleration/deceleration (driving "intensity")
  harshAccelerationEvents: number;
  harshBrakingEvents: number;
  safetyScore: number; // 0-100, penalizes frequent harsh accel/brake events
  smoothnessScore: number; // 0-100, penalizes jerky (rapidly changing) acceleration
  comfortScore: number; // 0-100 composite of safety + smoothness
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Computes acceleration extremes plus safety/smoothness/comfort scores for a
 * completed trip. Falls back to neutral 100/0 values when there isn't enough
 * speed data to derive acceleration (e.g. an old saved trip, or a very short
 * trip) rather than showing a misleadingly low score from too little data.
 */
export function calculateTripPerformance(coordinates: Coordinate[], durationSec: number): TripPerformance {
  const samples = calculateAccelerationSeries(coordinates);

  if (samples.length === 0) {
    return {
      maxAccelerationMs2: 0,
      maxBrakingMs2: 0,
      avgAccelerationMs2: 0,
      harshAccelerationEvents: 0,
      harshBrakingEvents: 0,
      safetyScore: 100,
      smoothnessScore: 100,
      comfortScore: 100,
    };
  }

  let maxAccel = 0;
  let maxBrake = 0;
  let harshAccel = 0;
  let harshBrake = 0;
  let sumAbsAccel = 0;

  for (const sample of samples) {
    const a = sample.accelerationMs2;
    if (a > maxAccel) maxAccel = a;
    if (-a > maxBrake) maxBrake = -a;
    if (a >= HARSH_ACCEL_THRESHOLD_MS2) harshAccel++;
    if (a <= HARSH_BRAKE_THRESHOLD_MS2) harshBrake++;
    sumAbsAccel += Math.abs(a);
  }
  const avgAccel = sumAbsAccel / samples.length;

  // Safety: penalize harsh events per minute of driving (rate-based, so a
  // long trip with a couple of harsh brakes isn't scored the same as a short
  // trip with the same count).
  const minutes = Math.max(durationSec / 60, 1 / 60);
  const harshEventsPerMinute = (harshAccel + harshBrake) / minutes;
  const safetyScore = clamp(100 - harshEventsPerMinute * 15, 0, 100);

  // Smoothness: average "jerk" — how much acceleration swings from one
  // sample to the next. Big swings feel jerky/uncomfortable even if no
  // single sample crosses the harsh-event threshold.
  let jerkSum = 0;
  for (let i = 1; i < samples.length; i++) {
    jerkSum += Math.abs(samples[i].accelerationMs2 - samples[i - 1].accelerationMs2);
  }
  const avgJerk = samples.length > 1 ? jerkSum / (samples.length - 1) : 0;
  const smoothnessScore = clamp(100 - avgJerk * 25, 0, 100);

  const comfortScore = Math.round((safetyScore + smoothnessScore) / 2);

  return {
    maxAccelerationMs2: Math.round(maxAccel * 10) / 10,
    maxBrakingMs2: Math.round(maxBrake * 10) / 10,
    avgAccelerationMs2: Math.round(avgAccel * 10) / 10,
    harshAccelerationEvents: harshAccel,
    harshBrakingEvents: harshBrake,
    safetyScore: Math.round(safetyScore),
    smoothnessScore: Math.round(smoothnessScore),
    comfortScore,
  };
}
