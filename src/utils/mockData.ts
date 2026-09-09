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

export interface IndianSimCity {
  id: string;
  name: string;
  state: string;
  landmark: string;
  center: { latitude: number; longitude: number };
  route: Omit<Coordinate, 'timestamp'>[];
}

export const INDIAN_SIMULATION_ROUTES: IndianSimCity[] = [
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    landmark: 'MG Road / Brigade Rd',
    center: { latitude: 12.9766, longitude: 77.5993 },
    route: [
      { latitude: 12.9766, longitude: 77.5993 }, // MG Road near Brigade Rd junction
      { latitude: 12.9750, longitude: 77.6018 }, // Trinity Circle
      { latitude: 12.9733, longitude: 77.6044 }, // Ulsoor Road
      { latitude: 12.9710, longitude: 77.6035 }, // Museum Road
      { latitude: 12.9693, longitude: 77.6008 }, // Richmond Circle
      { latitude: 12.9695, longitude: 77.5975 }, // Lalbagh Road junction
      { latitude: 12.9712, longitude: 77.5948 }, // Residency Road
      { latitude: 12.9733, longitude: 77.5944 }, // Lavelle Road
      { latitude: 12.9751, longitude: 77.5960 }, // Brigade Road
      { latitude: 12.9760, longitude: 77.5977 }, // Brigade Road near MG Road
      { latitude: 12.9766, longitude: 77.5993 }, // Back to MG Road start
    ],
  },
  {
    id: 'delhi',
    name: 'Delhi NCR',
    state: 'Delhi',
    landmark: 'Connaught Place & India Gate',
    center: { latitude: 28.6328, longitude: 77.2197 },
    route: [
      { latitude: 28.6328, longitude: 77.2197 }, // Connaught Place Inner Circle
      { latitude: 28.6285, longitude: 77.2180 }, // Janpath
      { latitude: 28.6220, longitude: 77.2155 }, // Janpath Windsor Place
      { latitude: 28.6144, longitude: 77.2088 }, // Rajpath / Kartavya Path
      { latitude: 28.6129, longitude: 77.2295 }, // India Gate C-Hexagon
      { latitude: 28.6200, longitude: 77.2280 }, // Kasturba Gandhi Marg
      { latitude: 28.6250, longitude: 77.2260 }, // KG Marg junction
      { latitude: 28.6310, longitude: 77.2240 }, // Barakhamba Road
      { latitude: 28.6328, longitude: 77.2197 }, // Back to Connaught Place
    ],
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    landmark: 'Marine Drive & Nariman Point',
    center: { latitude: 18.9256, longitude: 72.8236 },
    route: [
      { latitude: 18.9256, longitude: 72.8236 }, // Nariman Point
      { latitude: 18.9320, longitude: 72.8240 }, // Marine Drive Air India
      { latitude: 18.9388, longitude: 72.8238 }, // Marine Drive Wankhede
      { latitude: 18.9470, longitude: 72.8210 }, // Marine Drive Flyover
      { latitude: 18.9543, longitude: 72.8150 }, // Charni Road
      { latitude: 18.9560, longitude: 72.8130 }, // Chowpatty Beach
      { latitude: 18.9500, longitude: 72.8090 }, // Walkeshwar
      { latitude: 18.9410, longitude: 72.8170 }, // Maharshi Karve Rd
      { latitude: 18.9310, longitude: 72.8210 }, // Churchgate
      { latitude: 18.9256, longitude: 72.8236 }, // Nariman Point
    ],
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    landmark: 'Hitec City & Gachibowli',
    center: { latitude: 17.4504, longitude: 78.3808 },
    route: [
      { latitude: 17.4504, longitude: 78.3808 }, // Cyber Towers Hitec City
      { latitude: 17.4440, longitude: 78.3770 }, // Mindspace Junction
      { latitude: 17.4370, longitude: 78.3730 }, // Raidurgam
      { latitude: 17.4330, longitude: 78.3750 }, // Bio-Diversity Park
      { latitude: 17.4380, longitude: 78.3650 }, // Gachibowli ORR junction
      { latitude: 17.4430, longitude: 78.3580 }, // Gachibowli Stadium
      { latitude: 17.4480, longitude: 78.3680 }, // Hitec City Road
      { latitude: 17.4504, longitude: 78.3808 }, // Cyber Towers
    ],
  },
  {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    landmark: 'OMR IT Corridor & Tidel Park',
    center: { latitude: 12.9890, longitude: 80.2480 },
    route: [
      { latitude: 12.9890, longitude: 80.2480 }, // Tidel Park Thiruvanmiyur
      { latitude: 12.9750, longitude: 80.2460 }, // SRP Tools OMR
      { latitude: 12.9640, longitude: 80.2440 }, // Kandanchavadi Perungudi
      { latitude: 12.9500, longitude: 80.2400 }, // Thoraipakkam Toll
      { latitude: 12.9520, longitude: 80.2350 }, // Radial Road
      { latitude: 12.9650, longitude: 80.2390 }, // Perungudi Link
      { latitude: 12.9790, longitude: 80.2430 }, // Taramani
      { latitude: 12.9890, longitude: 80.2480 }, // Tidel Park
    ],
  },
];

// Default simulated route (backward-compatibility)
export const SIMULATED_ROUTE: Omit<Coordinate, 'timestamp'>[] = INDIAN_SIMULATION_ROUTES[0].route;

