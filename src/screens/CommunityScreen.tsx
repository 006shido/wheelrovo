import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Users, Car, Play } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { getCurrentUser, UserProfile, Trip } from '../utils/storage';
import { getFriends, getFriendTrips } from '../utils/friends';
import { formatDistance, formatDuration, formatSpeed } from '../utils/stats';
import ScoreBar from '../components/ScoreBar';
import WebMapView from '../components/WebMapView';

let MapView: any;
let Polyline: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const MapModule = require('react-native-maps');
  MapView = MapModule.default;
  Polyline = MapModule.Polyline;
  Marker = MapModule.Marker;
}

interface FeedPost {
  trip: Trip;
  friend: UserProfile;
  sortKey: number;
}

// Trip ids are minted as `trip-${Date.now()}`, so this recovers a real
// timestamp for combining multiple friends' trips into one chronological
// feed — Trip only stores a pre-formatted display `date` string, not a raw
// epoch value.
function extractTimestamp(tripId: string): number {
  const match = tripId.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export default function CommunityScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [hasFriends, setHasFriends] = useState(true);
  const [playbackTriggers, setPlaybackTriggers] = useState<Record<string, number>>({});

  const triggerPlayback = (tripId: string) => {
    setPlaybackTriggers((prev) => ({
      ...prev,
      [tripId]: (prev[tripId] || 0) + 1,
    }));
  };

  const renderCardMap = (trip: Trip) => {
    if (!trip.coordinates || trip.coordinates.length === 0) {
      return null;
    }

    if (Platform.OS === 'web') {
      return (
        <View style={styles.cardMapContainer}>
          <WebMapView
            coordinates={trip.coordinates}
            mapType="standard"
            playbackTrigger={playbackTriggers[trip.id] || 0}
            isHistoryMode={true}
          />
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
          mapType="standard"
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Polyline
            coordinates={trip.coordinates}
            strokeColor={Theme.colors.primary}
            strokeWidth={4}
          />
          <Marker coordinate={startCoord} title="Start" pinColor="#22C55E" />
          <Marker coordinate={endCoord} title="End" pinColor="#EF4444" />
        </MapView>
      </View>
    );
  };

  const loadFeed = useCallback(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const friends = await getFriends(currentUser.email);
    setHasFriends(friends.length > 0);

    const tripsPerFriend = await Promise.all(
      friends.map(async ({ user }) => {
        const trips = await getFriendTrips(user.email);
        return trips.slice(0, 5).map((trip) => ({
          trip,
          friend: user,
          sortKey: extractTimestamp(trip.id),
        }));
      })
    );

    const feed = tripsPerFriend.flat().sort((a, b) => b.sortKey - a.sortKey);
    setPosts(feed);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COMMUNITY</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        {!hasFriends && (
          <View style={styles.emptyStateBox}>
            <Users color={Theme.colors.textMuted} size={32} />
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptyText}>
              Add drivers from Profile → Friends to see their trips show up here.
            </Text>
          </View>
        )}

        {hasFriends && posts.length === 0 && (
          <View style={styles.emptyStateBox}>
            <Car color={Theme.colors.textMuted} size={32} />
            <Text style={styles.emptyTitle}>No trips shared yet</Text>
            <Text style={styles.emptyText}>Once your friends log a drive, it'll show up here.</Text>
          </View>
        )}

        {posts.map(({ trip, friend }) => (
          <View key={`${friend.email}-${trip.id}`} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{friend.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.postHeaderText}>
                <Text style={styles.postFriendName}>{friend.name}</Text>
                <Text style={styles.postMeta}>
                  @{friend.username} · {trip.date}
                </Text>
              </View>
            </View>

            {/* Driven Route Map for Accepted Friends */}
            {renderCardMap(trip)}

            <View style={styles.tripStatsRow}>
              <View style={styles.tripStatItem}>
                <Text style={styles.tripStatLabel}>DISTANCE</Text>
                <Text style={styles.tripStatValue}>{formatDistance(trip.distance)} KM</Text>
              </View>
              <View style={styles.tripStatItem}>
                <Text style={styles.tripStatLabel}>DURATION</Text>
                <Text style={styles.tripStatValue}>{formatDuration(trip.duration)}</Text>
              </View>
              <View style={styles.tripStatItem}>
                <Text style={styles.tripStatLabel}>TOP SPEED</Text>
                <Text style={styles.tripStatValue}>{formatSpeed(trip.topSpeed ?? trip.avgSpeed)} KM/H</Text>
              </View>
            </View>

            {trip.safetyScore != null && trip.smoothnessScore != null && trip.comfortScore != null && (
              <View style={styles.scoresContainer}>
                <ScoreBar label="SAFETY" score={trip.safetyScore} />
                <ScoreBar label="SMOOTHNESS" score={trip.smoothnessScore} />
                <ScoreBar label="COMFORT" score={trip.comfortScore} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: Theme.colors.border,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  container: {
    padding: Theme.spacing.md,
  },
  emptyStateBox: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: Theme.spacing.md,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
  },
  postCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  postHeaderText: {
    marginLeft: Theme.spacing.sm,
  },
  postFriendName: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  postMeta: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  tripStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
  },
  tripStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  tripStatLabel: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tripStatValue: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 4,
  },
  scoresContainer: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
  },
  cardMapContainer: {
    height: 180,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    position: 'relative',
    marginBottom: Theme.spacing.md,
    backgroundColor: '#000000',
  },
  playbackBtnOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    elevation: 4,
  },
  playbackBtnText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  nativeCardMap: {
    width: '100%',
    height: '100%',
  },
});
