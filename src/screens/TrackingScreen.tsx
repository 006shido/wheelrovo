import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { Play, Square, Navigation, Award, RotateCcw, MapPin, Globe } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Theme } from '../styles/theme';
import { Coordinate, getDistance, calculateRouteDistance, formatDistance, formatDuration, formatSpeed, calculateTripPerformance, formatAcceleration, TripPerformance } from '../utils/stats';
import { SIMULATED_ROUTE } from '../utils/mockData';
import { saveTrip, loadDriverState, saveDriverState, loadCompletedTasks, saveCompletedTasks, DriverState, Trip } from '../utils/storage';
import WebMapView from '../components/WebMapView';
import ScoreBar from '../components/ScoreBar';
import {
  requestBackgroundLocationPermissions,
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../services/locationTask';
import { getPointsForTrip } from '../services/db';

// Recomputes the authoritative trip summary from what actually made it to the
// durable SQLite buffer, rather than trusting in-memory React state — the
// background task can keep writing points after the screen backgrounds and
// this component's state stops updating, so the DB may have more (and more
// accurate) data than `coordinates`/`topSpeed` do by the time Stop is pressed.
async function reconcileTripFromDb(tripId: string) {
  const points = await getPointsForTrip(tripId);
  if (points.length === 0) return null;

  const coordinates: Coordinate[] = points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    timestamp: p.timestamp,
    speedKmh: p.speed != null ? p.speed * 3.6 : undefined,
  }));
  const distance = calculateRouteDistance(coordinates);
  const durationSec = Math.max(
    1,
    Math.round((points[points.length - 1].timestamp - points[0].timestamp) / 1000)
  );
  const topSpeedKmh = points.reduce((max, p) => Math.max(max, (p.speed ?? 0) * 3.6), 0);

  return { coordinates, distance, durationSec, topSpeedKmh };
}

// Conditionally import MapView to prevent compilation crashes on Web
let MapView: any;
let Polyline: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const MapModule = require('react-native-maps');
  MapView = MapModule.default;
  Polyline = MapModule.Polyline;
  Marker = MapModule.Marker;
}

interface TrackingScreenProps {
  onTripCompleted: () => void;
  userId: string;
}

export default function TrackingScreen({ onTripCompleted, userId }: TrackingScreenProps) {
  // Identifies the SQLite trip row + background task session for the current
  // recording; null when nothing is being tracked.
  const activeTripIdRef = useRef<string | null>(null);
  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [useSimulator, setUseSimulator] = useState(Platform.OS === 'web');
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  
  // Map Type state (standard vs satellite)
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  // Live Telemetry
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [topSpeed, setTopSpeed] = useState(0); // Track top speed
  const [distance, setDistance] = useState(0);

  // Summary Modal state
  const [showSummary, setShowSummary] = useState(false);
  const [lastTripSummary, setLastTripSummary] = useState<{
    distance: number;
    duration: number;
    avgSpeed: number;
    topSpeed: number;
    xpEarned: number;
    unlockedTasks: string[];
    streakSecured: boolean;
    newStreak: number;
    performance: TripPerformance;
  } | null>(null);

  // References for timers
  const timerRef = useRef<any | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const simulatorIndexRef = useRef(0);
  const simulatorTimerRef = useRef<any | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Location.getForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');
      }
    })();

    return () => {
      stopTimer();
      stopLocationTracking();
      stopSimulation();
    };
  }, []);

  // Request permissions
  const requestPermissions = async () => {
    // Background permission implies foreground is already granted (the OS
    // requires the foreground prompt first), so this covers both the live
    // in-app updates and the ability to keep logging while backgrounded.
    const granted = await requestBackgroundLocationPermissions();
    setLocationPermission(granted);
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Wheelrovo needs "Always Allow" location access to keep tracking your drive while your phone is locked or the app is in the background.'
      );
    }
    return granted;
  };

  // Timer functions
  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Location Tracking functions
  const startLocationTracking = async () => {
    if (Platform.OS === 'web') return;

    let granted = locationPermission;
    if (!granted) {
      granted = await requestPermissions();
    }
    if (!granted) return;

    try {
      stopLocationTracking();
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 2000,
        },
        (location) => {
          const { latitude, longitude, speed } = location.coords;
          const speedKmh = speed ? speed * 3.6 : 0;
          const newCoord: Coordinate = {
            latitude,
            longitude,
            timestamp: location.timestamp,
            speedKmh,
          };

          setCurrentSpeed(speedKmh);
          setTopSpeed((prev) => Math.max(prev, speedKmh)); // Update top speed

          setCoordinates((prev) => {
            const nextCoords = [...prev, newCoord];
            const totalDist = calculateRouteDistance(nextCoords);
            setDistance(totalDist);
            return nextCoords;
          });
        }
      );
    } catch (e) {
      console.error('Error starting location subscription', e);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  // Simulator functions
  const startSimulation = () => {
    stopSimulation();
    simulatorIndexRef.current = 0;
    setCoordinates([]);
    setDistance(0);
    setCurrentSpeed(0);
    setTopSpeed(0);

    const runSimStep = () => {
      const routeLength = SIMULATED_ROUTE.length;
      const index = simulatorIndexRef.current % routeLength;
      const simPoint = SIMULATED_ROUTE[index];

      const simSpeed = 40 + Math.random() * 35; // speed up to 75 km/h
      setCurrentSpeed(simSpeed);
      setTopSpeed((prev) => Math.max(prev, simSpeed));

      const newCoord: Coordinate = {
        latitude: simPoint.latitude,
        longitude: simPoint.longitude,
        timestamp: Date.now(),
        speedKmh: simSpeed,
      };

      setCoordinates((prev) => {
        const nextCoords = [...prev, newCoord];
        const totalDist = calculateRouteDistance(nextCoords);
        setDistance(totalDist);
        return nextCoords;
      });

      simulatorIndexRef.current += 1;
    };

    runSimStep();
    simulatorTimerRef.current = setInterval(runSimStep, 3000);
  };

  const stopSimulation = () => {
    if (simulatorTimerRef.current) {
      clearInterval(simulatorTimerRef.current);
      simulatorTimerRef.current = null;
    }
  };

  // Start / Stop Trigger
  const handleStartStop = async () => {
    if (!isTracking) {
      setIsTracking(true);
      setDuration(0);
      setDistance(0);
      setCurrentSpeed(0);
      setTopSpeed(0);
      setCoordinates([]);
      setShowSummary(false);

      startTimer();
      if (useSimulator) {
        startSimulation();
      } else {
        // Foreground watch drives the live speed/distance readout on screen;
        // the background task is the durable path that keeps recording once
        // the phone locks or the app leaves the foreground, writing straight
        // to SQLite so nothing depends on this component staying mounted.
        const tripId = `trip-${Date.now()}`;
        activeTripIdRef.current = tripId;
        await startLocationTracking();
        try {
          await startBackgroundTracking(tripId, userId);
        } catch (e) {
          console.error('Failed to start background tracking', e);
          Alert.alert(
            'Background Tracking Unavailable',
            'Live tracking will still work while the app is open, but the drive may stop logging if you lock your phone or switch apps.'
          );
        }
      }
    } else {
      setIsTracking(false);
      stopTimer();
      if (useSimulator) {
        stopSimulation();
        processCompletedTrip();
      } else {
        stopLocationTracking();
        const tripId = activeTripIdRef.current;
        if (tripId) {
          await stopBackgroundTracking(tripId);
          const reconciled = await reconcileTripFromDb(tripId);
          activeTripIdRef.current = null;
          if (reconciled) {
            processCompletedTrip(reconciled);
            return;
          }
        }
        // Fell through with no DB points (e.g. permission was denied and the
        // background task never started) — fall back to whatever the
        // foreground watch captured in React state.
        processCompletedTrip();
      }
    }
  };

  // Finalize trip, check achievements, save to storage.
  // `reconciled` (when present) comes from the durable SQLite buffer and
  // takes precedence over in-memory state, since background tracking may
  // have kept capturing points after this component's state stopped updating.
  const processCompletedTrip = async (reconciled?: {
    coordinates: Coordinate[];
    distance: number;
    durationSec: number;
    topSpeedKmh: number;
  }) => {
    const finalDuration = reconciled?.durationSec ?? duration;
    const finalDistance = reconciled?.distance ?? distance;
    const finalTopSpeed = reconciled?.topSpeedKmh ?? topSpeed;
    const finalCoordinates = reconciled?.coordinates ?? coordinates;

    if (finalDuration < 5) {
      Alert.alert('Trip Too Short', 'Drive tracking must be at least 5 seconds long to save.');
      return;
    }

    const avgSpeed = finalDistance > 0 && finalDuration > 0 ? (finalDistance / (finalDuration / 3600)) : 0;
    const performance = calculateTripPerformance(finalCoordinates, finalDuration);

    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      duration: finalDuration,
      distance: finalDistance,
      avgSpeed,
      topSpeed: finalTopSpeed,
      coordinates: finalCoordinates,
      maxAccelerationMs2: performance.maxAccelerationMs2,
      maxBrakingMs2: performance.maxBrakingMs2,
      avgAccelerationMs2: performance.avgAccelerationMs2,
      harshAccelerationEvents: performance.harshAccelerationEvents,
      harshBrakingEvents: performance.harshBrakingEvents,
      safetyScore: performance.safetyScore,
      smoothnessScore: performance.smoothnessScore,
      comfortScore: performance.comfortScore,
    };

    await saveTrip(newTrip);

    // Load current driver progress
    const driverState = await loadDriverState();
    const completedTaskIds = await loadCompletedTasks();
    
    // --- AUTOMATIC FIRST-DRIVE CHECKIN GATE ---
    let streakSecured = false;
    let newStreak = driverState.streak;
    let checkinXpBonus = 0;
    const todayStr = new Date().toDateString();

    if (driverState.lastLoginDate !== todayStr) {
      // User hasn't checked in today yet! Completing this drive checks them in.
      streakSecured = true;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (driverState.lastLoginDate === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1; // start new streak
      }

      // Mark daily check-in task completed
      if (!completedTaskIds.includes('task-1')) {
        completedTaskIds.push('task-1');
        checkinXpBonus = 15; // 15 XP reward
      }
    }

    // Evaluate other daily tasks
    let xpAwarded = 10 + checkinXpBonus; // Base completion + checkin bonus
    const newlyCompletedTaskIds: string[] = [];

    if (streakSecured) {
      newlyCompletedTaskIds.push('Daily Check-in (First Drive)');
    }

    // Task 2: Distance Commute (> 1.5 km)
    if (finalDistance >= 1.5 && !completedTaskIds.includes('task-2')) {
      completedTaskIds.push('task-2');
      newlyCompletedTaskIds.push('Short Commute');
      xpAwarded += 30;
    }

    // Task 3: Eco Cruiser (avg speed < 50 km/h)
    if (finalDistance > 0.1 && avgSpeed < 50 && !completedTaskIds.includes('task-3')) {
      completedTaskIds.push('task-3');
      newlyCompletedTaskIds.push('Eco Cruiser');
      xpAwarded += 25;
    }

    // Task 4: Road Endurance (> 60 seconds)
    if (finalDuration >= 60 && !completedTaskIds.includes('task-4')) {
      completedTaskIds.push('task-4');
      newlyCompletedTaskIds.push('Road Endurance');
      xpAwarded += 20;
    }

    // Task 5: Smooth Operator (smoothness score >= 80)
    if (performance.smoothnessScore >= 80 && !completedTaskIds.includes('task-5')) {
      completedTaskIds.push('task-5');
      newlyCompletedTaskIds.push('Smooth Operator');
      xpAwarded += 30;
    }

    // Task 6: Steady Hands (safety score >= 85)
    if (performance.safetyScore >= 85 && !completedTaskIds.includes('task-6')) {
      completedTaskIds.push('task-6');
      newlyCompletedTaskIds.push('Steady Hands');
      xpAwarded += 30;
    }

    // Save completed tasks list if updated
    if (newlyCompletedTaskIds.length > 0) {
      await saveCompletedTasks(completedTaskIds);
    }

    // Save driver progress state
    const newXp = driverState.xp + xpAwarded;
    const MILESTONES = [
      { level: 1, title: 'Rookie Driver', xpRequired: 0 },
      { level: 2, title: 'Road Voyager', xpRequired: 50 },
      { level: 3, title: 'Highway Star', xpRequired: 150 },
      { level: 4, title: 'Asphalt Legend', xpRequired: 300 },
    ];

    let newLevel = driverState.level;
    for (const milestone of MILESTONES) {
      if (newXp >= milestone.xpRequired) {
        newLevel = milestone.level;
      }
    }

    const newDriverState: DriverState = {
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      lastLoginDate: todayStr, // Mark logged in today
    };
    await saveDriverState(newDriverState);

    // Save summary details to display
    setLastTripSummary({
      distance: finalDistance,
      duration: finalDuration,
      avgSpeed,
      topSpeed: finalTopSpeed,
      xpEarned: xpAwarded,
      unlockedTasks: newlyCompletedTaskIds,
      streakSecured,
      newStreak,
      performance,
    });
    setShowSummary(true);

    // Trigger parent screens refresh
    onTripCompleted();

    if (newLevel > driverState.level) {
      setTimeout(() => {
        Alert.alert(
          '🎉 LEVEL UP!',
          `You reached Level ${newLevel}: ${
            MILESTONES.find((m) => m.level === newLevel)?.title.toUpperCase() || ''
          }!`
        );
      }, 500);
    }
  };

  const toggleMapType = () => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  // Map Rendering logic
  const renderMap = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={{ flex: 1, position: 'relative' }}>
          <WebMapView coordinates={coordinates} mapType={mapType} />
          
          {/* Floating Map Mode Selector (Web) */}
          <TouchableOpacity style={styles.floatingMapControl} onPress={toggleMapType} activeOpacity={0.8}>
            <Globe color={Theme.colors.primary} size={14} />
            <Text style={styles.mapControlText}>
              {mapType === 'satellite' ? 'MAP: SATELLITE' : 'MAP: STANDARD'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const defaultRegion = {
      latitude: coordinates.length > 0 ? coordinates[coordinates.length - 1].latitude : 37.7749,
      longitude: coordinates.length > 0 ? coordinates[coordinates.length - 1].longitude : -122.4194,
      latitudeDelta: 0.00922,
      longitudeDelta: 0.00421,
    };

    return (
      <View style={{ flex: 1, position: 'relative' }}>
        <MapView
          style={styles.map}
          mapType={mapType}
          theme="dark"
          initialRegion={defaultRegion}
          region={defaultRegion}
          showsUserLocation={!useSimulator}
          showsMyLocationButton={!useSimulator}
        >
          {coordinates.length > 0 && (
            <>
              <Polyline
                coordinates={coordinates}
                strokeColor={Theme.colors.primary}
                strokeWidth={4}
              />
              <Marker
                coordinate={coordinates[coordinates.length - 1]}
                title="Active Driver"
                description="Your current position"
              >
                <View style={styles.markerContainer}>
                  <View style={styles.markerOutline}>
                    <Navigation
                      color="#000000"
                      size={12}
                      style={{ transform: [{ rotate: '45deg' }] }}
                    />
                  </View>
                </View>
              </Marker>
            </>
          )}
        </MapView>

        {/* Floating Map Mode Selector (Native) */}
        <TouchableOpacity style={styles.floatingMapControl} onPress={toggleMapType} activeOpacity={0.8}>
          <Globe color={Theme.colors.primary} size={14} />
          <Text style={styles.mapControlText}>
            {mapType === 'satellite' ? 'MAP: SATELLITE' : 'MAP: STANDARD'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapSection}>{renderMap()}</View>

      {/* Simulator toggle bar */}
      <View style={styles.simulatorConfig}>
        <View style={styles.simulatorTextRow}>
          <Text style={styles.simulatorTitle}>GPS SIMULATION</Text>
          <Text style={styles.simulatorSubtitle}>Runs a mock driving loop for development testing</Text>
        </View>
        <Switch
          value={useSimulator}
          disabled={isTracking}
          onValueChange={(val) => setUseSimulator(val)}
          trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
          thumbColor={useSimulator ? '#000000' : Theme.colors.textMuted}
        />
      </View>

      {/* Summary Dialog overlay */}
      {showSummary && lastTripSummary && (
        <View style={styles.summaryOverlay}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Award color={Theme.colors.primary} size={24} />
              <Text style={styles.summaryTitle}>DRIVE COMPLETE</Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryGridCell}>
                <Text style={styles.summaryLabel}>DISTANCE</Text>
                <Text style={styles.summaryVal}>{formatDistance(lastTripSummary.distance)} KM</Text>
              </View>
              <View style={styles.summaryGridCell}>
                <Text style={styles.summaryLabel}>DURATION</Text>
                <Text style={styles.summaryVal}>{formatDuration(lastTripSummary.duration)}</Text>
              </View>
              <View style={styles.summaryGridCell}>
                <Text style={styles.summaryLabel}>TOP SPEED</Text>
                <Text style={styles.summaryVal}>{formatSpeed(lastTripSummary.topSpeed)} KM/H</Text>
              </View>
            </View>

            <View style={styles.summaryXpAward}>
              <Text style={styles.summaryXpText}>+{lastTripSummary.xpEarned} XP AWARDED</Text>
            </View>

            {/* Driving Performance Breakdown */}
            <View style={styles.performanceSection}>
              <Text style={styles.performanceSectionTitle}>DRIVING PERFORMANCE</Text>
              <ScoreBar label="SAFETY" score={lastTripSummary.performance.safetyScore} />
              <ScoreBar label="SMOOTHNESS" score={lastTripSummary.performance.smoothnessScore} />
              <ScoreBar label="COMFORT" score={lastTripSummary.performance.comfortScore} />
              <View style={styles.accelRow}>
                <View style={styles.accelCell}>
                  <Text style={styles.summaryLabel}>MAX ACCEL</Text>
                  <Text style={styles.summaryVal}>
                    {formatAcceleration(lastTripSummary.performance.maxAccelerationMs2)} m/s²
                  </Text>
                </View>
                <View style={styles.accelCell}>
                  <Text style={styles.summaryLabel}>MAX BRAKING</Text>
                  <Text style={styles.summaryVal}>
                    {formatAcceleration(lastTripSummary.performance.maxBrakingMs2)} m/s²
                  </Text>
                </View>
              </View>
            </View>

            {lastTripSummary.streakSecured && (
              <View style={styles.streakAlertContainer}>
                <Text style={styles.streakAlertText}>
                  🔥 DAILY CHECK-IN COMPLETE! STREAK: {lastTripSummary.newStreak} DAYS (+15 XP)
                </Text>
              </View>
            )}

            {lastTripSummary.unlockedTasks.length > 0 && (
              <View style={styles.unlockedContainer}>
                <Text style={styles.unlockedTitle}>COMPLETED TASKS:</Text>
                {lastTripSummary.unlockedTasks.map((tName, i) => (
                  <Text key={i} style={styles.unlockedItem}>
                    • {tName.toUpperCase()}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.summaryCloseBtn} onPress={() => setShowSummary(false)}>
              <Text style={styles.summaryCloseBtnText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Live Telemetry Display */}
      <View style={styles.telemetryCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DISTANCE</Text>
            <Text style={styles.statValue}>{formatDistance(distance)}</Text>
            <Text style={styles.statUnit}>KM</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SPEED</Text>
            <Text style={styles.statValue}>{formatSpeed(currentSpeed)}</Text>
            <Text style={styles.statUnit}>KM/H</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statUnit}>TIME</Text>
          </View>
        </View>

        {/* Start / Stop tracking button */}
        <View style={styles.actionContainer}>
          {isTracking ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonActive]}
              onPress={handleStartStop}
              activeOpacity={0.8}
            >
              <View style={styles.btnContent}>
                <Square color="#FFFFFF" size={16} fill="#FFFFFF" />
                <Text style={styles.btnTextActive}>STOP DRIVE</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonInactive]}
              onPress={handleStartStop}
              activeOpacity={0.8}
            >
              <View style={styles.btnContent}>
                <Play color="#000000" size={16} fill="#000000" />
                <Text style={styles.btnTextInactive}>START DRIVE</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  mapSection: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  floatingMapControl: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mapControlText: {
    color: Theme.colors.textPrimary,
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  markerContainer: {
    width: 22,
    height: 22,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerOutline: {
    width: 14,
    height: 14,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatorConfig: {
    backgroundColor: Theme.colors.cardBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: Theme.colors.border,
  },
  simulatorTextRow: {
    flex: 1,
  },
  simulatorTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  simulatorSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  telemetryCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderTopLeftRadius: Theme.borderRadius.md,
    borderTopRightRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderTopWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: Theme.spacing.xs,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statValue: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
  },
  divider: {
    width: 1.5,
    height: 30,
    backgroundColor: Theme.colors.border,
  },
  actionContainer: {
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  actionButton: {
    width: '100%',
    height: 46,
    borderRadius: Theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  actionButtonInactive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  actionButtonActive: {
    backgroundColor: '#000000',
    borderColor: Theme.colors.primary,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnTextInactive: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  btnTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  summaryOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: Theme.spacing.lg,
  },
  summaryCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.lg,
    width: '100%',
    maxWidth: 300,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  summaryTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: Theme.spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
    marginVertical: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  summaryGridCell: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
  },
  summaryVal: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryXpAward: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    marginVertical: Theme.spacing.sm,
    backgroundColor: '#000000',
  },
  summaryXpText: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  performanceSection: {
    width: '100%',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: '#000000',
  },
  performanceSectionTitle: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: Theme.spacing.sm,
  },
  accelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xs,
  },
  accelCell: {
    flex: 1,
  },
  streakAlertContainer: {
    marginVertical: 4,
    backgroundColor: Theme.colors.cardHighlight,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  streakAlertText: {
    color: Theme.colors.primary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  unlockedContainer: {
    width: '100%',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    alignItems: 'flex-start',
  },
  unlockedTitle: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  unlockedItem: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginLeft: Theme.spacing.xs,
    marginTop: 2,
  },
  summaryCloseBtn: {
    backgroundColor: Theme.colors.primary,
    width: '100%',
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
  },
  summaryCloseBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
