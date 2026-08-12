import { Trip } from './storage';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  // Given the full trip history (+ derived stats), returns how far toward
  // unlocked this achievement is. `value`/`target` are in whatever unit the
  // achievement description implies (km, trip count, score points, etc.).
  evaluate: (trips: Trip[]) => { value: number; target: number };
}

function totalDistanceKm(trips: Trip[]): number {
  return trips.reduce((sum, t) => sum + t.distance, 0);
}

// Longest streak of consecutive trips (most recent first, since loadTrips
// prepends new trips) meeting a per-trip predicate.
function longestRecentStreak(trips: Trip[], predicate: (t: Trip) => boolean): number {
  let longest = 0;
  let current = 0;
  for (const trip of trips) {
    if (predicate(trip)) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

// Trips that don't have performance scores yet (saved before this feature
// existed) are treated as neutral/unknown rather than failing safety/smoothness
// achievements outright.
const hasScore = (t: Trip) => t.safetyScore != null && t.smoothnessScore != null;

export const ACHIEVEMENTS: Achievement[] = [
  // --- Distance milestones ---
  {
    id: 'ach-distance-bronze',
    title: 'First Mile',
    description: 'Drive a lifetime total of 10 km',
    tier: 'bronze',
    evaluate: (trips) => ({ value: totalDistanceKm(trips), target: 10 }),
  },
  {
    id: 'ach-distance-silver',
    title: 'Road Regular',
    description: 'Drive a lifetime total of 50 km',
    tier: 'silver',
    evaluate: (trips) => ({ value: totalDistanceKm(trips), target: 50 }),
  },
  {
    id: 'ach-distance-gold',
    title: 'Highway Veteran',
    description: 'Drive a lifetime total of 200 km',
    tier: 'gold',
    evaluate: (trips) => ({ value: totalDistanceKm(trips), target: 200 }),
  },
  {
    id: 'ach-distance-platinum',
    title: 'Odometer Breaker',
    description: 'Drive a lifetime total of 1,000 km',
    tier: 'platinum',
    evaluate: (trips) => ({ value: totalDistanceKm(trips), target: 1000 }),
  },

  // --- Trip-count milestones ---
  {
    id: 'ach-trips-bronze',
    title: 'Getting Started',
    description: 'Log 5 completed trips',
    tier: 'bronze',
    evaluate: (trips) => ({ value: trips.length, target: 5 }),
  },
  {
    id: 'ach-trips-silver',
    title: 'Creature of Habit',
    description: 'Log 25 completed trips',
    tier: 'silver',
    evaluate: (trips) => ({ value: trips.length, target: 25 }),
  },
  {
    id: 'ach-trips-gold',
    title: 'Logbook Legend',
    description: 'Log 100 completed trips',
    tier: 'gold',
    evaluate: (trips) => ({ value: trips.length, target: 100 }),
  },

  // --- Safety & smoothness streaks ---
  {
    id: 'ach-safety-bronze',
    title: 'Steady Hands',
    description: 'Complete 3 trips in a row with a safety score of 85+',
    tier: 'bronze',
    evaluate: (trips) => ({
      value: longestRecentStreak(trips, (t) => hasScore(t) && (t.safetyScore ?? 0) >= 85),
      target: 3,
    }),
  },
  {
    id: 'ach-safety-silver',
    title: 'Defensive Driver',
    description: 'Complete 10 trips in a row with a safety score of 85+',
    tier: 'silver',
    evaluate: (trips) => ({
      value: longestRecentStreak(trips, (t) => hasScore(t) && (t.safetyScore ?? 0) >= 85),
      target: 10,
    }),
  },
  {
    id: 'ach-smoothness-bronze',
    title: 'Smooth Operator',
    description: 'Complete 3 trips in a row with a smoothness score of 85+',
    tier: 'bronze',
    evaluate: (trips) => ({
      value: longestRecentStreak(trips, (t) => hasScore(t) && (t.smoothnessScore ?? 0) >= 85),
      target: 3,
    }),
  },
  {
    id: 'ach-smoothness-silver',
    title: 'Glass of Water on the Dash',
    description: 'Complete 10 trips in a row with a smoothness score of 85+',
    tier: 'silver',
    evaluate: (trips) => ({
      value: longestRecentStreak(trips, (t) => hasScore(t) && (t.smoothnessScore ?? 0) >= 85),
      target: 10,
    }),
  },
  {
    id: 'ach-no-harsh-events',
    title: 'Zero Incidents',
    description: 'Complete a trip of 5+ km with no harsh acceleration or braking events',
    tier: 'gold',
    evaluate: (trips) => {
      const qualifies = trips.some(
        (t) =>
          t.distance >= 5 &&
          hasScore(t) &&
          (t.harshAccelerationEvents ?? 0) === 0 &&
          (t.harshBrakingEvents ?? 0) === 0
      );
      return { value: qualifies ? 1 : 0, target: 1 };
    },
  },

  // --- Endurance ---
  {
    id: 'ach-endurance-bronze',
    title: 'Long Haul',
    description: 'Complete a single trip of 30+ minutes',
    tier: 'bronze',
    evaluate: (trips) => {
      const longest = trips.reduce((max, t) => Math.max(max, t.duration), 0);
      return { value: longest, target: 30 * 60 };
    },
  },
];

export interface AchievementProgress {
  achievement: Achievement;
  unlocked: boolean;
  value: number;
  target: number;
  progress: number; // 0-1
}

export function computeAchievementProgress(trips: Trip[]): AchievementProgress[] {
  return ACHIEVEMENTS.map((achievement) => {
    const { value, target } = achievement.evaluate(trips);
    const progress = target > 0 ? Math.min(1, value / target) : 0;
    return { achievement, unlocked: value >= target, value, target, progress };
  });
}
