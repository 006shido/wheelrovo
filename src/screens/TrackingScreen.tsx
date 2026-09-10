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
import { Play, Pause, Square, Navigation, Award, RotateCcw, MapPin, Globe, Volume2, VolumeX } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Theme } from '../styles/theme';
import { Coordinate, getDistance, calculateRouteDistance, formatDistance, formatDuration, formatSpeed, calculateTripPerformance, formatAcceleration, TripPerformance } from '../utils/stats';
import { SIMULATED_ROUTE, INDIAN_SIMULATION_ROUTES, IndianSimCity } from '../utils/mockData';
import { saveTrip, loadDriverState, saveDriverState, loadCompletedTasks, saveCompletedTasks, DriverState, Trip } from '../utils/storage';
import WebMapView from '../components/WebMapView';
import ScoreBar from '../components/ScoreBar';
import { pushTripSummary, pushDriverStats } from '../utils/friends';
import {
  RadarCamera,
  RadarAlert,
  fetchNearbyCameras,
  findActiveRadarAlert,
  getCurrentSpeedLimit,
  getBearing,
} from '../services/radarCameraService';
import { radarAudio } from '../services/radarAudioService';
import { RADAR_MAP_STYLE } from '../styles/radarMapStyle';
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
  const [isPaused, setIsPaused] = useState(false);
  const [useSimulator, setUseSimulator] = useState(Platform.OS === 'web');
  const [selectedCityId, setSelectedCityId] = useState<string>(INDIAN_SIMULATION_ROUTES[0].id);
  const currentCity = INDIAN_SIMULATION_ROUTES.find((c) => c.id === selectedCityId) || INDIAN_SIMULATION_ROUTES[0];
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  const handleSelectCity = (cityId: string) => {
    if (isTracking) return;
    const city = INDIAN_SIMULATION_ROUTES.find((c) => c.id === cityId);
    if (!city) return;
    setSelectedCityId(city.id);
    setCoordinates([]);
    setDistance(0);
    setCurrentSpeed(0);
    setTopSpeed(0);
    lastCameraFetchCell.current = '';
    refreshCamerasAt(city.center.latitude, city.center.longitude);
    if (Platform.OS !== 'web' && nativeMapRef.current) {
      nativeMapRef.current.animateToRegion(
        {
          latitude: city.center.latitude,
          longitude: city.center.longitude,
          latitudeDelta: 0.00922,
          longitudeDelta: 0.00421,
        },
        1000
      );
    }
  };
  
  // Map Type state (radar vs standard vs satellite)
  const [mapType, setMapType] = useState<'radar' | 'standard' | 'satellite'>('radar');

  // Radarbot Camera & Speed Alert state — start empty, fill from first position
  const [cameras, setCameras] = useState<RadarCamera[]>([]);
  const [activeAlert, setActiveAlert] = useState<RadarAlert | null>(null);
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<number>(60);
  const [heading, setHeading] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(radarAudio.getIsMuted());

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
  const nativeMapRef = useRef<any | null>(null);
  const lastGpsCoordRef = useRef<Coordinate | null>(null);

  // Smooth camera follow for native MapView
  useEffect(() => {
    if (Platform.OS !== 'web' && nativeMapRef.current && coordinates.length > 0) {
      const latest = coordinates[coordinates.length - 1];
      nativeMapRef.current.animateCamera(
        {
          center: { latitude: latest.latitude, longitude: latest.longitude },
          heading: heading,
        },
        { duration: 1000 }
      );
    }
  }, [coordinates, heading]);

  // Camera fetch ref — tracks last fetched cell to avoid redundant calls
  const lastCameraFetchCell = useRef<string>('');

  // Fetch cameras around a position (1° grid cell prevents redundant refetches)
  const refreshCamerasAt = async (lat: number, lon: number) => {
    const cell = `${Math.floor(lat * 100)},${Math.floor(lon * 100)}`;
    if (cell === lastCameraFetchCell.current) return;
    lastCameraFetchCell.current = cell;
    try {
      const fetched = await fetchNearbyCameras(lat, lon);
      if (fetched && fetched.length > 0) setCameras(fetched);
    } catch {
      // keep existing cameras
    }
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Location.getForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');
      }
      // On web/simulator, seed cameras at the selected city center immediately
      const firstPt = currentCity.center;
      refreshCamerasAt(firstPt.latitude, firstPt.longitude);
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
      lastGpsCoordRef.current = null;
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

          // Calculate heading
          let bearing = heading;
          if (location.coords.heading !== null && location.coords.heading !== undefined && location.coords.heading >= 0) {
            bearing = location.coords.heading;
            setHeading(bearing);
          }

          const prevCoord = lastGpsCoordRef.current;
          lastGpsCoordRef.current = newCoord;

          if (prevCoord) {
            const stepDist = getDistance(prevCoord, newCoord);
            setDistance((prev) => Number((prev + stepDist).toFixed(2)));

            if (!location.coords.heading || location.coords.heading < 0) {
              bearing = getBearing(prevCoord.latitude, prevCoord.longitude, latitude, longitude);
              setHeading(bearing);
            }
          }

          const alert = findActiveRadarAlert(newCoord, prevCoord, cameras, speedKmh, 600);
          setActiveAlert(alert);

          const limit = getCurrentSpeedLimit(newCoord, cameras);
          setCurrentSpeedLimit(limit);

          if (alert) radarAudio.playProximityChime(alert.distanceMeters);
          if (speedKmh > limit) radarAudio.playOverspeedAlarm();

          setCoordinates((prev) => [...prev, newCoord]);

          // Refresh cameras as driver moves to new area (works anywhere in the world)
          refreshCamerasAt(latitude, longitude);
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
    lastGpsCoordRef.current = null;
  };

  // Simulator functions
  const pauseSimulation = () => {
    if (simulatorTimerRef.current) {
      clearInterval(simulatorTimerRef.current);
      simulatorTimerRef.current = null;
    }
  };

  const resumeSimulation = () => {
    pauseSimulation();
    const activeRoute = currentCity.route;
    const runSimStep = () => {
      const routeLength = activeRoute.length;
      const index = simulatorIndexRef.current % routeLength;
      const simPoint = activeRoute[index];
      const prevPoint =
        simulatorIndexRef.current > 0
          ? activeRoute[(simulatorIndexRef.current - 1) % routeLength]
          : null;

      // Realistic speed variation along real road curve
      let simSpeed = 52 + Math.sin(index * 0.18) * 10;
      if ((index % 35 >= 8 && index % 35 <= 14)) {
        simSpeed = 68; // Overspeed triggers near camera!
      } else if (index % 25 === 0) {
        simSpeed = 38; // Intersection turn deceleration
      }
      simSpeed = Math.max(30, Math.round(simSpeed));

      setCurrentSpeed(simSpeed);
      setTopSpeed((prev) => Math.max(prev, simSpeed));

      const newCoord: Coordinate = {
        latitude: simPoint.latitude,
        longitude: simPoint.longitude,
        timestamp: Date.now(),
        speedKmh: simSpeed,
      };

      const prevCoord: Coordinate | null = prevPoint
        ? {
            latitude: prevPoint.latitude,
            longitude: prevPoint.longitude,
            timestamp: Date.now() - 1400,
            speedKmh: simSpeed,
          }
        : null;

      if (prevCoord) {
        const b = getBearing(
          prevCoord.latitude,
          prevCoord.longitude,
          simPoint.latitude,
          simPoint.longitude
        );
        setHeading(b);

        const stepDist = getDistance(prevCoord, newCoord);
        setDistance((prev) => Number((prev + stepDist).toFixed(2)));
      }

      const alert = findActiveRadarAlert(newCoord, prevCoord, cameras, simSpeed, 600);
      setActiveAlert(alert);

      const limit = getCurrentSpeedLimit(newCoord, cameras);
      setCurrentSpeedLimit(limit);

      if (alert) radarAudio.playProximityChime(alert.distanceMeters);
      if (simSpeed > limit) radarAudio.playOverspeedAlarm();

      setCoordinates((prev) => [...prev, newCoord]);

      // Re-fetch cameras every 12 steps (≈ every ~300 meters moved)
      if (simulatorIndexRef.current % 12 === 0) {
        refreshCamerasAt(simPoint.latitude, simPoint.longitude);
      }

      simulatorIndexRef.current += 1;
    };

    runSimStep();
    simulatorTimerRef.current = setInterval(runSimStep, 1400);
  };

  const startSimulation = () => {
    pauseSimulation();
    simulatorIndexRef.current = 0;
    setCoordinates([]);
    setDistance(0);
    setCurrentSpeed(0);
    setTopSpeed(0);
    resumeSimulation();
  };

  const stopSimulation = () => {
    pauseSimulation();
    simulatorIndexRef.current = 0;
  };

  // Pause / Resume Trigger
  const handlePauseResume = () => {
    if (!isTracking) return;
    if (!isPaused) {
      // Pause
      setIsPaused(true);
      stopTimer();
      if (useSimulator) {
        pauseSimulation();
      }
      setCurrentSpeed(0);
    } else {
      // Resume
      setIsPaused(false);
      startTimer();
      if (useSimulator) {
        resumeSimulation();
      }
    }
  };

  // Start / Stop Trigger
  const handleStartStop = async () => {
    if (!isTracking) {
      setIsTracking(true);
      setIsPaused(false);
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
      setIsPaused(false);
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
    // Best-effort — friends can't see this trip until real Supabase is wired
    // up, but this keeps the remote `trips` table current from day one.
    pushTripSummary(newTrip, userId).catch((e) => console.error('pushTripSummary failed', e));

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
    pushDriverStats(userId, newDriverState).catch((e) => console.error('pushDriverStats failed', e));

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

  const cycleMapType = () => {
    setMapType((prev) => {
      if (prev === 'radar') return 'standard';
      if (prev === 'standard') return 'satellite';
      return 'radar';
    });
  };

  const toggleAudio = () => {
    const muted = radarAudio.toggleMute();
    setIsAudioMuted(muted);
  };

  // Map Rendering logic
  const renderMap = () => {
    if (Platform.OS === 'web') {
      return (
        <WebMapView
          coordinates={coordinates}
          mapType={mapType}
          cameras={cameras}
          activeAlert={activeAlert}
          heading={heading}
          currentSpeed={currentSpeed}
          centerLocation={coordinates.length === 0 ? currentCity.center : undefined}
          isHistoryMode={false}
        />
      );
    }

    const defaultRegion = {
      latitude: coordinates.length > 0 ? coordinates[coordinates.length - 1].latitude : currentCity.center.latitude,
      longitude: coordinates.length > 0 ? coordinates[coordinates.length - 1].longitude : currentCity.center.longitude,
      latitudeDelta: 0.00922,
      longitudeDelta: 0.00421,
    };

    return (
      <MapView
        ref={nativeMapRef}
        style={styles.map}
        mapType={mapType === 'satellite' ? 'satellite' : 'standard'}
        customMapStyle={mapType === 'radar' ? RADAR_MAP_STYLE : undefined}
        theme="dark"
        initialRegion={defaultRegion}
        showsUserLocation={!useSimulator}
        showsMyLocationButton={!useSimulator}
      >
        {/* Speed camera markers */}
        {cameras.map((cam) => (
          <Marker
            key={cam.id}
            coordinate={{ latitude: cam.latitude, longitude: cam.longitude }}
            title={cam.description}
            description={`Speed limit: ${cam.speedLimit} km/h`}
          >
            <View
              style={[
                styles.nativeCameraBadge,
                activeAlert?.camera?.id === cam.id && styles.nativeCameraBadgeAlert,
              ]}
            >
              <Text style={styles.nativeCameraEmoji}>
                {cam.type === 'seatbelt'
                  ? '🦺'
                  : cam.type === 'mobile_phone'
                  ? '📱'
                  : cam.type === 'red_light'
                  ? '🚦'
                  : cam.type === 'mobile'
                  ? '🚨'
                  : cam.type === 'section'
                  ? '⚡'
                  : '📷'}
              </Text>
              <Text style={styles.nativeCameraSpeed}>{cam.speedLimit}</Text>
            </View>
          </Marker>
        ))}

        {coordinates.length > 0 && (
          <>
            <Polyline
              coordinates={coordinates}
              strokeColor={mapType === 'radar' ? '#00f2fe' : Theme.colors.primary}
              strokeWidth={5}
            />
            <Marker
              coordinate={coordinates[coordinates.length - 1]}
              title="Active Driver"
              description="Your current position"
              rotation={heading}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.nativeVehicleMarker}>
                <Navigation
                  color="#00f2fe"
                  size={20}
                  fill="#00f2fe"
                />
              </View>
            </Marker>
          </>
        )}
      </MapView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapSection}>
        {renderMap()}

        {/* Floating Radarbot Cockpit HUD Overlay */}
        <View style={styles.hudOverlay} pointerEvents="box-none">
            {/* Speed Limit Badge — bottom-left so it never overlaps zoom buttons */}
          <View style={styles.speedLimitCorner}>
            <View
              style={[
                styles.speedLimitSign,
                currentSpeed > currentSpeedLimit && styles.speedLimitSignAlert,
              ]}
            >
              <Text style={styles.speedLimitValue}>{currentSpeedLimit}</Text>
              <Text style={styles.speedLimitLabel}>LIMIT</Text>
            </View>
          </View>

          {/* Active Radar Proximity Alert Banner — top center */}
          {activeAlert && (
            <View
              style={[
                styles.radarAlertBanner,
                activeAlert.isOverSpeed && styles.radarAlertBannerDanger,
                activeAlert.camera.type === 'seatbelt' && styles.radarAlertBannerSeatbelt,
              ]}
            >
              <Text style={styles.radarAlertEmoji}>
                {activeAlert.camera.type === 'seatbelt'
                  ? '🦺'
                  : activeAlert.camera.type === 'mobile_phone'
                  ? '📱'
                  : activeAlert.camera.type === 'red_light'
                  ? '🚦'
                  : activeAlert.camera.type === 'mobile'
                  ? '🚨'
                  : activeAlert.camera.type === 'section'
                  ? '⚡'
                  : '📷'}
              </Text>
              <View style={styles.radarAlertTextCol}>
                <View style={styles.radarAlertTitleRow}>
                  <Text style={styles.radarAlertTitle}>
                    {activeAlert.camera.description.toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.radarDistancePill,
                      activeAlert.camera.type === 'seatbelt' && { backgroundColor: '#f59e0b' },
                    ]}
                  >
                    <Text style={styles.radarDistanceText}>
                      {activeAlert.distanceMeters}M
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.radarAlertSub,
                    activeAlert.camera.type === 'seatbelt' && { color: '#fcd34d' },
                  ]}
                >
                  {activeAlert.camera.type === 'seatbelt'
                    ? 'BUCKLE UP! • SEATBELT CAMERA'
                    : activeAlert.camera.type === 'mobile_phone'
                    ? 'HANDS-FREE ONLY! • PHONE CAMERA'
                    : activeAlert.isOverSpeed
                    ? `⚠️ SLOW DOWN! LIMIT ${activeAlert.camera.speedLimit} KM/H`
                    : `LIMIT ${activeAlert.camera.speedLimit} KM/H`}
                </Text>
              </View>
            </View>
          )}

          {/* Top Right Controls Group */}
          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={styles.hudIconButton}
              onPress={toggleAudio}
              activeOpacity={0.8}
            >
              {isAudioMuted ? (
                <VolumeX color={Theme.colors.textMuted} size={15} />
              ) : (
                <Volume2 color="#00f2fe" size={15} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.floatingMapControl}
              onPress={cycleMapType}
              activeOpacity={0.8}
            >
              <Globe
                color={mapType === 'radar' ? '#00f2fe' : Theme.colors.primary}
                size={14}
              />
              <Text
                style={[
                  styles.mapControlText,
                  mapType === 'radar' && { color: '#00f2fe' },
                ]}
              >
                {mapType === 'radar'
                  ? 'RADAR HUD'
                  : mapType === 'satellite'
                  ? 'SATELLITE'
                  : 'STANDARD'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Simulator toggle & Indian City Selection */}
      <View style={styles.simulatorContainer}>
        <View style={styles.simulatorConfig}>
          <View style={styles.simulatorTextRow}>
            <Text style={styles.simulatorTitle}>GPS SIMULATION (INDIA)</Text>
            <Text style={styles.simulatorSubtitle}>
              {currentCity.name} • {currentCity.landmark}
            </Text>
          </View>
          <Switch
            value={useSimulator}
            disabled={isTracking}
            onValueChange={(val) => setUseSimulator(val)}
            trackColor={{ false: Theme.colors.border, true: Theme.colors.primary }}
            thumbColor={useSimulator ? '#000000' : Theme.colors.textMuted}
          />
        </View>

        {useSimulator && (
          <View style={styles.citySelectorRow}>
            {INDIAN_SIMULATION_ROUTES.map((city) => {
              const isSelected = city.id === currentCity.id;
              return (
                <TouchableOpacity
                  key={city.id}
                  style={[
                    styles.cityChip,
                    isSelected && styles.cityChipSelected,
                    isTracking && styles.cityChipDisabled,
                  ]}
                  onPress={() => handleSelectCity(city.id)}
                  disabled={isTracking}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      isSelected && styles.cityChipTextSelected,
                    ]}
                  >
                    {city.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
            <Text
              style={[
                styles.statValue,
                isPaused && { color: '#f59e0b' },
                currentSpeed > currentSpeedLimit && styles.statValueOverSpeed,
              ]}
            >
              {isPaused ? '0.0' : formatSpeed(currentSpeed)}
            </Text>
            <Text
              style={[
                styles.statUnit,
                isPaused && { color: '#f59e0b' },
                currentSpeed > currentSpeedLimit && styles.statUnitOverSpeed,
              ]}
            >
              {isPaused
                ? '⏸️ PAUSED'
                : currentSpeed > currentSpeedLimit
                ? '⚠️ OVERSPEED'
                : 'KM/H'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statUnit}>TIME</Text>
          </View>
        </View>

        {/* Start / Pause / Stop tracking buttons */}
        <View style={styles.actionContainer}>
          {!isTracking ? (
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
          ) : (
            <View style={styles.activeButtonRow}>
              <TouchableOpacity
                style={[
                  styles.dualActionButton,
                  isPaused ? styles.resumeButton : styles.pauseButton,
                ]}
                onPress={handlePauseResume}
                activeOpacity={0.8}
              >
                <View style={styles.btnContent}>
                  {isPaused ? (
                    <>
                      <Play color="#000000" size={15} fill="#000000" />
                      <Text style={styles.resumeBtnText}>RESUME</Text>
                    </>
                  ) : (
                    <>
                      <Pause color="#f59e0b" size={15} fill="#f59e0b" />
                      <Text style={styles.pauseBtnText}>PAUSE</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dualActionButton, styles.stopButton]}
                onPress={handleStartStop}
                activeOpacity={0.8}
              >
                <View style={styles.btnContent}>
                  <Square color="#ef4444" size={14} fill="#ef4444" />
                  <Text style={styles.stopBtnText}>STOP DRIVE</Text>
                </View>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  topRightControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLimitCorner: {
    position: 'absolute',
    bottom: 80,
    left: 12,
  },
  hudIconButton: {
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderRadius: Theme.borderRadius.sm,
    padding: 6,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedLimitSign: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 3.5,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  speedLimitSignAlert: {
    borderColor: '#FF0055',
    shadowColor: '#FF0055',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    transform: [{ scale: 1.08 }],
  },
  speedLimitValue: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  speedLimitLabel: {
    color: '#EF4444',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: -1,
  },
  radarAlertBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 130,
    backgroundColor: 'rgba(11, 15, 25, 0.94)',
    borderWidth: 1.5,
    borderColor: '#06b6d4',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  radarAlertBannerDanger: {
    backgroundColor: 'rgba(30, 10, 15, 0.96)',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  radarAlertBannerSeatbelt: {
    backgroundColor: 'rgba(28, 20, 10, 0.96)',
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  radarAlertEmoji: {
    fontSize: 16,
  },
  radarAlertTextCol: {
    flex: 1,
  },
  radarAlertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarAlertTitle: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 3,
  },
  radarDistancePill: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  radarDistanceText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  radarAlertSub: {
    color: '#38bdf8',
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 1,
  },
  statValueOverSpeed: {
    color: '#EF4444',
  },
  statUnitOverSpeed: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  nativeCameraBadge: {
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    borderWidth: 1.5,
    borderColor: '#06b6d4',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  nativeCameraBadgeAlert: {
    borderColor: '#EF4444',
  },
  nativeCameraEmoji: {
    fontSize: 12,
  },
  nativeCameraSpeed: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  nativeVehicleMarker: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
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
  simulatorContainer: {
    backgroundColor: Theme.colors.cardBackground,
    borderBottomWidth: 1.5,
    borderBottomColor: Theme.colors.border,
  },
  simulatorConfig: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  citySelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    gap: 6,
    flexWrap: 'wrap',
  },
  cityChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#111827',
  },
  cityChipSelected: {
    borderColor: '#00f2fe',
    backgroundColor: 'rgba(0, 242, 254, 0.18)',
  },
  cityChipDisabled: {
    opacity: 0.5,
  },
  cityChipText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  cityChipTextSelected: {
    color: '#00f2fe',
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
  activeButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  dualActionButton: {
    flex: 1,
    height: 46,
    borderRadius: Theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  pauseButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#f59e0b',
  },
  resumeButton: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  stopButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#ef4444',
  },
  pauseBtnText: {
    color: '#f59e0b',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  resumeBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  stopBtnText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: Theme.spacing.sm,
    letterSpacing: 0.5,
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
