import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Calendar, Trash2, Globe, Play, Navigation } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { loadTrips, Trip } from '../utils/storage';
import { formatDistance, formatDuration, formatSpeed, formatAcceleration } from '../utils/stats';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebMapView from '../components/WebMapView';
import ScoreBar from '../components/ScoreBar';
import { confirmAction } from '../utils/confirm';

// Conditionally import native maps to avoid compilation crashes in web browsers
let MapView: any;
let Polyline: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const MapModule = require('react-native-maps');
  MapView = MapModule.default;
  Polyline = MapModule.Polyline;
  Marker = MapModule.Marker;
}

interface HistoryScreenProps {
  refreshTrigger?: number;
  onHistoryCleared?: () => void;
}

export default function HistoryScreen({ refreshTrigger, onHistoryCleared }: HistoryScreenProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Map settings
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [playbackTriggers, setPlaybackTriggers] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTrips();
  }, [refreshTrigger]);

  const fetchTrips = async () => {
    setLoading(true);
    const savedTrips = await loadTrips();
    setTrips(savedTrips);
    setLoading(false);
  };

  const handleClearHistory = () => {
    confirmAction(
      'Clear History',
      'Are you sure you want to delete all saved trip logs? This cannot be undone.',
      'Clear All',
      async () => {
        try {
          const currentUserJson = await AsyncStorage.getItem('@wheelrovo:current_user');
          if (currentUserJson) {
            const currentUser = JSON.parse(currentUserJson);
            await AsyncStorage.removeItem(`@wheelrovo:trips:${currentUser.email}`);
          } else {
            await AsyncStorage.removeItem('@wheelrovo:trips');
          }
          setTrips([]);
          if (onHistoryCleared) onHistoryCleared();
        } catch (e) {
          console.error('Error clearing trips', e);
        }
      }
    );
  };

  const toggleGlobalMapType = () => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  const triggerPlayback = (tripId: string) => {
    setPlaybackTriggers((prev) => ({
      ...prev,
      [tripId]: (prev[tripId] || 0) + 1,
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading history logs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Helper to format start/end coords text
  const getCoordinatesText = (trip: Trip) => {
    if (!trip.coordinates || trip.coordinates.length === 0) return 'NO GPS DATA';
    const start = trip.coordinates[0];
    const end = trip.coordinates[trip.coordinates.length - 1];
    return `START: ${start.latitude.toFixed(4)}, ${start.longitude.toFixed(4)} • END: ${end.latitude.toFixed(4)}, ${end.longitude.toFixed(4)}`;
  };

  // Render map inside a specific history log card
  const renderCardMap = (trip: Trip) => {
    if (!trip.coordinates || trip.coordinates.length === 0) {
      return (
        <View style={styles.noMapPlaceholder}>
          <Text style={styles.noMapText}>No coordinates recorded for this trip</Text>
        </View>
      );
    }

    if (Platform.OS === 'web') {
      return (
        <View style={styles.cardMapContainer}>
          <WebMapView 
            coordinates={trip.coordinates} 
            mapType={mapType} 
            playbackTrigger={playbackTriggers[trip.id] || 0}
          />
          
          {/* Action Overlay Button for playback */}
          <TouchableOpacity 
            style={styles.playbackBtnOverlay} 
            onPress={() => triggerPlayback(trip.id)}
            activeOpacity={0.8}
          >
            <Play color="#000000" size={12} fill="#000000" />
            <Text style={styles.playbackBtnText}>PLAY TRIP</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Native Platform Map Rendering
    const startCoord = trip.coordinates[0];
    const endCoord = trip.coordinates[trip.coordinates.length - 1];
    const region = {
      latitude: (startCoord.latitude + endCoord.latitude) / 2,
      longitude: (startCoord.longitude + endCoord.longitude) / 2,
      latitudeDelta: Math.abs(startCoord.latitude - endCoord.latitude) * 1.5 || 0.0122,
      longitudeDelta: Math.abs(startCoord.longitude - endCoord.longitude) * 1.5 || 0.0121,
    };

    return (
      <View style={styles.cardMapContainer}>
        <MapView
          style={styles.nativeCardMap}
          mapType={mapType}
          theme="dark"
          initialRegion={region}
          scrollEnabled={true}
          zoomEnabled={true}
          cacheEnabled={true}
        >
          <Polyline
            coordinates={trip.coordinates}
            strokeColor={Theme.colors.primary}
            strokeWidth={3}
          />
          {/* Start Marker (Green Pin) */}
          <Marker coordinate={startCoord} title="Start Location">
            <View style={[styles.nativeMarker, { backgroundColor: '#10B981' }]} />
          </Marker>
          {/* End Marker (Red Pin) */}
          <Marker coordinate={endCoord} title="End Location">
            <View style={[styles.nativeMarker, { backgroundColor: '#EF4444' }]} />
          </Marker>
        </MapView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DRIVING LOGS</Text>
        <View style={styles.headerActions}>
          {trips.length > 0 && (
            <>
              <TouchableOpacity onPress={toggleGlobalMapType} style={styles.mapToggleBtn} activeOpacity={0.7}>
                <Globe color={Theme.colors.primary} size={16} />
                <Text style={styles.mapToggleText}>
                  {mapType === 'satellite' ? 'SATELLITE' : 'STANDARD'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearHistory} style={styles.clearButton} activeOpacity={0.7}>
                <Trash2 color={Theme.colors.textSecondary} size={18} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {trips.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Calendar color={Theme.colors.textMuted} size={48} />
          <Text style={styles.emptyTitle}>NO DRIVES LOGGED</Text>
          <Text style={styles.emptySubtitle}>
            Your active trips will be visualised here. Go to the Track tab to record your first drive!
          </Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {trips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={styles.dateRow}>
                  <Calendar color={Theme.colors.primary} size={14} />
                  <Text style={styles.tripDate}>{trip.date}</Text>
                </View>
                <View style={styles.idBadge}>
                  <Text style={styles.idText}>GPS RECORD</Text>
                </View>
              </View>

              {/* Start & End GPS location label */}
              <View style={styles.locationBadgeContainer}>
                <Text style={styles.locationBadgeText} numberOfLines={1}>
                  {getCoordinatesText(trip)}
                </Text>
              </View>

              {/* Interactive Map Render */}
              {renderCardMap(trip)}

              {/* Symmetric 4-column Stats Row */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statValue}>
                    {formatDistance(trip.distance)}
                    <Text style={styles.statUnit}> km</Text>
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Avg Speed</Text>
                  <Text style={styles.statValue}>
                    {formatSpeed(trip.avgSpeed)}
                    <Text style={styles.statUnit}> km/h</Text>
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Top Speed</Text>
                  <Text style={styles.statValue}>
                    {trip.topSpeed ? formatSpeed(trip.topSpeed) : formatSpeed(trip.avgSpeed * 1.15)}
                    <Text style={styles.statUnit}> km/h</Text>
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>
                    {formatDuration(trip.duration)}
                  </Text>
                </View>
              </View>

              {/* Driving performance breakdown — only present on trips saved
                  after this feature shipped; older trips fall back gracefully. */}
              {trip.safetyScore != null && trip.smoothnessScore != null && trip.comfortScore != null && (
                <View style={styles.performanceCard}>
                  <Text style={styles.performanceCardTitle}>DRIVING PERFORMANCE</Text>
                  <ScoreBar label="SAFETY" score={trip.safetyScore} />
                  <ScoreBar label="SMOOTHNESS" score={trip.smoothnessScore} />
                  <ScoreBar label="COMFORT" score={trip.comfortScore} />
                  <View style={styles.performanceMetaRow}>
                    <Text style={styles.performanceMetaText}>
                      Max accel {formatAcceleration(trip.maxAccelerationMs2 ?? 0)} m/s² · Max braking{' '}
                      {formatAcceleration(trip.maxBrakingMs2 ?? 0)} m/s²
                    </Text>
                    {(trip.harshAccelerationEvents ?? 0) + (trip.harshBrakingEvents ?? 0) > 0 && (
                      <Text style={styles.performanceMetaText}>
                        {(trip.harshAccelerationEvents ?? 0) + (trip.harshBrakingEvents ?? 0)} harsh event
                        {(trip.harshAccelerationEvents ?? 0) + (trip.harshBrakingEvents ?? 0) === 1 ? '' : 's'}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: Theme.colors.border,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: Theme.spacing.sm,
  },
  mapToggleText: {
    color: Theme.colors.textPrimary,
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  clearButton: {
    padding: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
  },
  listContainer: {
    padding: Theme.spacing.md,
  },
  tripCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.lg, // curvy edges
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDate: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: Theme.spacing.sm,
  },
  idBadge: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  idText: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
  },
  locationBadgeContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 5,
    marginBottom: Theme.spacing.md,
  },
  locationBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  cardMapContainer: {
    height: 180,
    borderRadius: Theme.borderRadius.md, // curvy maps
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    position: 'relative',
    marginBottom: Theme.spacing.md,
    backgroundColor: '#000000',
  },
  nativeCardMap: {
    width: '100%',
    height: '100%',
  },
  nativeMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  noMapPlaceholder: {
    height: 120,
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  noMapText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
  },
  playbackBtnOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.sm, // curvy buttons
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  playbackBtnText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
  },
  statItem: {
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
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statUnit: {
    fontSize: 9,
    color: Theme.colors.textSecondary,
    fontWeight: 'normal',
  },
  divider: {
    width: 1.5,
    height: 20,
    backgroundColor: Theme.colors.border,
  },
  performanceCard: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  performanceCardTitle: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: Theme.spacing.sm,
  },
  performanceMetaRow: {
    marginTop: 4,
  },
  performanceMetaText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  emptyTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: Theme.spacing.md,
    letterSpacing: 1,
  },
  emptySubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    lineHeight: 16,
  },
});
