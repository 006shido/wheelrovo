import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinate } from './stats';

export interface Trip {
  id: string;
  date: string;
  duration: number; // in seconds
  distance: number; // in km
  avgSpeed: number; // in km/h
  topSpeed?: number; // in km/h
  coordinates: Coordinate[];
  // Performance/driving-quality fields — optional so trips saved before this
  // feature existed still load fine without these.
  maxAccelerationMs2?: number;
  maxBrakingMs2?: number;
  avgAccelerationMs2?: number;
  harshAccelerationEvents?: number;
  harshBrakingEvents?: number;
  safetyScore?: number;
  smoothnessScore?: number;
  comfortScore?: number;
}

export interface DriverState {
  xp: number;
  level: number;
  streak: number;
  lastLoginDate: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  driverType: string; // e.g., Casual, Delivery, Trucker, Racer
}

export interface UserAccount extends UserProfile {
  passwordHash: string; // simple local cleartext password for offline demonstration
}

const KEYS = {
  DRIVER_STATE: '@wheelrovo:driver_state',
  COMPLETED_TASKS: '@wheelrovo:completed_tasks',
  TRIPS: '@wheelrovo:trips',
  USERS: '@wheelrovo:registered_users',
  CURRENT_USER: '@wheelrovo:current_user',
};

// --- AUTH FUNCTIONS ---

export async function registerUser(
  name: string,
  email: string,
  password: string,
  driverType: string
): Promise<boolean> {
  try {
    const formattedEmail = email.trim().toLowerCase();
    const usersJson = await AsyncStorage.getItem(KEYS.USERS);
    const users: UserAccount[] = usersJson ? JSON.parse(usersJson) : [];

    // Check if user already exists
    const exists = users.some((u) => u.email === formattedEmail);
    if (exists) return false;

    const newUser: UserAccount = {
      name,
      email: formattedEmail,
      passwordHash: password, // Store password simply for local validation
      driverType,
    };

    users.push(newUser);
    await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
    return true;
  } catch (error) {
    console.error('Error registering user:', error);
    return false;
  }
}

export async function loginUser(email: string, password: string): Promise<UserProfile | null> {
  try {
    const formattedEmail = email.trim().toLowerCase();
    const usersJson = await AsyncStorage.getItem(KEYS.USERS);
    const users: UserAccount[] = usersJson ? JSON.parse(usersJson) : [];

    const user = users.find((u) => u.email === formattedEmail && u.passwordHash === password);
    if (user) {
      const profile: UserProfile = {
        name: user.name,
        email: user.email,
        driverType: user.driverType,
      };
      await setCurrentUser(profile);
      return profile;
    }
  } catch (error) {
    console.error('Error logging in user:', error);
  }
  return null;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const value = await AsyncStorage.getItem(KEYS.CURRENT_USER);
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  return null;
}

export async function setCurrentUser(profile: UserProfile | null): Promise<void> {
  try {
    if (profile === null) {
      await AsyncStorage.removeItem(KEYS.CURRENT_USER);
    } else {
      await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(profile));
    }
  } catch (error) {
    console.error('Error setting current user:', error);
  }
}

// --- TELEMETRY & PROGRESS FUNCTIONS ---

export async function saveDriverState(state: DriverState): Promise<void> {
  try {
    const currentUser = await getCurrentUser();
    const key = currentUser ? `${KEYS.DRIVER_STATE}:${currentUser.email}` : KEYS.DRIVER_STATE;
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving driver state:', error);
  }
}

export async function loadDriverState(): Promise<DriverState> {
  try {
    const currentUser = await getCurrentUser();
    const key = currentUser ? `${KEYS.DRIVER_STATE}:${currentUser.email}` : KEYS.DRIVER_STATE;
    const value = await AsyncStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error('Error loading driver state:', error);
  }
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastLoginDate: null,
  };
}

export async function saveCompletedTasks(taskIds: string[]): Promise<void> {
  try {
    const currentUser = await getCurrentUser();
    const key = currentUser ? `${KEYS.COMPLETED_TASKS}:${currentUser.email}` : KEYS.COMPLETED_TASKS;
    await AsyncStorage.setItem(key, JSON.stringify(taskIds));
  } catch (error) {
    console.error('Error saving completed tasks:', error);
  }
}

export async function loadCompletedTasks(): Promise<string[]> {
  try {
    const currentUser = await getCurrentUser();
    const key = currentUser ? `${KEYS.COMPLETED_TASKS}:${currentUser.email}` : KEYS.COMPLETED_TASKS;
    const value = await AsyncStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error('Error loading completed tasks:', error);
  }
  return [];
}

export async function saveTrip(trip: Trip): Promise<Trip[]> {
  try {
    const currentUser = await getCurrentUser();
    const key = currentUser ? `${KEYS.TRIPS}:${currentUser.email}` : KEYS.TRIPS;
    const existingTrips = await loadTrips();
    const updatedTrips = [trip, ...existingTrips];
    await AsyncStorage.setItem(key, JSON.stringify(updatedTrips));
    return updatedTrips;
  } catch (error) {
    console.error('Error saving trip:', error);
    return [];
  }
}

export async function loadTrips(): Promise<Trip[]> {
  try {
    const currentUser = await getCurrentUser();
    const key = currentUser ? `${KEYS.TRIPS}:${currentUser.email}` : KEYS.TRIPS;
    const value = await AsyncStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error('Error loading trips:', error);
  }
  return [];
}

export async function clearAllData(): Promise<void> {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await AsyncStorage.multiRemove([
        `${KEYS.DRIVER_STATE}:${currentUser.email}`,
        `${KEYS.COMPLETED_TASKS}:${currentUser.email}`,
        `${KEYS.TRIPS}:${currentUser.email}`,
      ]);
    } else {
      await AsyncStorage.multiRemove([KEYS.DRIVER_STATE, KEYS.COMPLETED_TASKS, KEYS.TRIPS]);
    }
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

export async function updateUserPassword(email: string, newPassword: string): Promise<boolean> {
  try {
    const formattedEmail = email.trim().toLowerCase();
    const usersJson = await AsyncStorage.getItem(KEYS.USERS);
    const users: UserAccount[] = usersJson ? JSON.parse(usersJson) : [];
    
    const userIndex = users.findIndex((u) => u.email === formattedEmail);
    if (userIndex !== -1) {
      users[userIndex].passwordHash = newPassword;
      await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
      return true;
    }
  } catch (error) {
    console.error('Error updating user password:', error);
  }
  return false;
}

export async function updateUserName(email: string, newName: string): Promise<UserProfile | null> {
  try {
    const formattedEmail = email.trim().toLowerCase();
    const usersJson = await AsyncStorage.getItem(KEYS.USERS);
    const users: UserAccount[] = usersJson ? JSON.parse(usersJson) : [];

    const userIndex = users.findIndex((u) => u.email === formattedEmail);
    if (userIndex === -1) return null;

    users[userIndex].name = newName;
    await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));

    // Keep the active session in sync so the new name shows up immediately
    // without requiring a re-login.
    const updatedProfile: UserProfile = {
      name: users[userIndex].name,
      email: users[userIndex].email,
      driverType: users[userIndex].driverType,
    };
    await setCurrentUser(updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error('Error updating user name:', error);
    return null;
  }
}
