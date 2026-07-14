export interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
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
