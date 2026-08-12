import { Coordinate } from './stats';

export interface Task {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  completed: boolean;
  type: 'login' | 'distance' | 'speed' | 'duration' | 'safety' | 'smoothness';
  targetValue?: number; // e.g., 2 km, 120 seconds, or a 0-100 score threshold
}

export interface Milestone {
  level: number;
  title: string;
  xpRequired: number;
}

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Daily Check-in',
    description: 'Launch Wheelrovo today and check in',
    rewardXp: 15,
    completed: false,
    type: 'login',
  },
  {
    id: 'task-2',
    title: 'Short Commute',
    description: 'Drive a total of 1.5 km or more',
    rewardXp: 30,
    completed: false,
    type: 'distance',
    targetValue: 1.5,
  },
  {
    id: 'task-3',
    title: 'Eco Cruiser',
    description: 'Complete a trip with an average speed below 50 km/h',
    rewardXp: 25,
    completed: false,
    type: 'speed',
    targetValue: 50,
  },
  {
    id: 'task-4',
    title: 'Road Endurance',
    description: 'Track a single trip for more than 1 minute (60 seconds)',
    rewardXp: 20,
    completed: false,
    type: 'duration',
    targetValue: 60,
  },
  {
    id: 'task-5',
    title: 'Smooth Operator',
    description: 'Complete a trip with a smoothness score of 80 or higher',
    rewardXp: 30,
    completed: false,
    type: 'smoothness',
    targetValue: 80,
  },
  {
    id: 'task-6',
    title: 'Steady Hands',
    description: 'Complete a trip with a safety score of 85 or higher',
    rewardXp: 30,
    completed: false,
    type: 'safety',
    targetValue: 85,
  },
];

export const MILESTONES: Milestone[] = [
  { level: 1, title: 'Rookie Driver', xpRequired: 0 },
  { level: 2, title: 'Road Voyager', xpRequired: 50 },
  { level: 3, title: 'Highway Star', xpRequired: 150 },
  { level: 4, title: 'Asphalt Legend', xpRequired: 300 },
];

// Simulated driving coordinate list around a track for web/simulator preview
export const SIMULATED_ROUTE: Omit<Coordinate, 'timestamp'>[] = [
  { latitude: 37.774929, longitude: -122.419416 },
  { latitude: 37.775210, longitude: -122.418200 },
  { latitude: 37.775650, longitude: -122.416800 },
  { latitude: 37.776100, longitude: -122.415400 },
  { latitude: 37.775800, longitude: -122.414100 },
  { latitude: 37.774800, longitude: -122.413200 },
  { latitude: 37.773800, longitude: -122.414000 },
  { latitude: 37.773100, longitude: -122.415200 },
  { latitude: 37.773500, longitude: -122.416800 },
  { latitude: 37.774200, longitude: -122.418200 },
  { latitude: 37.774929, longitude: -122.419416 }, // Back to start
];
