import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Search,
  UserPlus,
  Check,
  X,
  Users,
  ChevronDown,
  ChevronUp,
  Car,
  Play,
  Lock,
  Route,
  Clock,
  Gauge,
  Shield,
  Globe,
} from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { isDemoMode } from '../utils/supabase';
import { getCurrentUser, UserProfile, Trip } from '../utils/storage';
import {
  searchUsers,
  sendFriendRequest,
  respondToFriendRequest,
  getFriends,
  getPendingRequests,
  getFriendTrips,
  getDriverPreview,
  DriverPreviewData,
  FriendRequestView,
  syncLocalTripsToRemote,
} from '../utils/friends';
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

type Section = 'friends' | 'requests' | 'search';

export default function FriendsScreen() {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [section, setSection] = useState<Section>('friends');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [friends, setFriends] = useState<{ friendshipId: string; user: UserProfile }[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestView[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestView[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Accepted friends state: full map rendering & playback
  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [friendTrips, setFriendTrips] = useState<Record<string, Trip[]>>({});
  const [loadingTripsFor, setLoadingTripsFor] = useState<string | null>(null);
  const [playbackTriggers, setPlaybackTriggers] = useState<Record<string, number>>({});

  // Non-friends / Search / Requests state: preview driver stats without map
  const [expandedPreviewUser, setExpandedPreviewUser] = useState<string | null>(null);
  const [driverPreviews, setDriverPreviews] = useState<Record<string, DriverPreviewData>>({});
  const [loadingPreviewFor, setLoadingPreviewFor] = useState<string | null>(null);

  const triggerPlayback = (tripId: string) => {
    setPlaybackTriggers((prev) => ({
      ...prev,
      [tripId]: (prev[tripId] || 0) + 1,
    }));
  };

  /**
   * Renders the driven route map ONLY for accepted friends.
   */
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

  /**
   * Renders a locked privacy banner when viewing a driver who is not yet an accepted friend.
   */
  const renderLockedMapBanner = () => (
    <View style={styles.lockedMapContainer}>
      <View style={styles.lockedMapIconCircle}>
        <Lock color={Theme.colors.textMuted} size={15} />
      </View>
      <View style={styles.lockedMapContent}>
        <Text style={styles.lockedMapTitle}>DRIVEN ROUTE MAP LOCKED</Text>
        <Text style={styles.lockedMapDesc}>
          GPS route coordinates and map playback are strictly private. Once friend request is accepted, map routes unlock in Community.
        </Text>
      </View>
    </View>
  );

  const loadAll = useCallback(async () => {
    const user = await getCurrentUser();
    setCurrentUserState(user);
    if (!user) {
      setLoading(false);
      return;
    }
    syncLocalTripsToRemote(user.email).catch(() => {});
    const [friendList, requests] = await Promise.all([getFriends(user.email), getPendingRequests(user.email)]);
    setFriends(friendList);
    setIncoming(requests.incoming);
    setOutgoing(requests.outgoing);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const runSearch = async (query: string) => {
    setSearchQuery(query);
    if (!currentUser) return;
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results = await searchUsers(query, currentUser.email);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSendRequest = async (target: UserProfile) => {
    if (!currentUser) return;
    setSendingTo(target.email);
    const result = await sendFriendRequest(currentUser.email, target.username);
    setSendingTo(null);
    if (result.success) {
      setSentRequests((prev) => new Set(prev).add(target.email));
      await loadAll();
    }
  };

  const handleRespond = async (request: FriendRequestView, accept: boolean) => {
    await respondToFriendRequest(request.id, accept, currentUser?.email);
    await loadAll();
  };

  const toggleFriendTrips = async (friendEmail: string) => {
    if (expandedFriend === friendEmail) {
      setExpandedFriend(null);
      return;
    }
    setExpandedFriend(friendEmail);
    if (!friendTrips[friendEmail]) {
      setLoadingTripsFor(friendEmail);
      const trips = await getFriendTrips(friendEmail);
      setFriendTrips((prev) => ({ ...prev, [friendEmail]: trips }));
      setLoadingTripsFor(null);
    }
  };

  const toggleDriverPreview = async (driverEmail: string, knownIsPrivate?: boolean) => {
    if (expandedPreviewUser === driverEmail) {
      setExpandedPreviewUser(null);
      return;
    }
    setExpandedPreviewUser(driverEmail);
    if (!driverPreviews[driverEmail]) {
      setLoadingPreviewFor(driverEmail);
      const preview = await getDriverPreview(driverEmail, knownIsPrivate);
      setDriverPreviews((prev) => ({ ...prev, [driverEmail]: preview }));
      setLoadingPreviewFor(null);
    }
  };

  /**
   * Helper to render driver performance overview & trips without route map.
   */
  const renderDriverPreviewSection = (user: UserProfile) => {
    const isLoading = loadingPreviewFor === user.email;
    const preview = driverPreviews[user.email];

    if (isLoading) {
      return (
        <View style={styles.previewContainer}>
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: Theme.spacing.md }} />
        </View>
      );
    }

    if (!preview) return null;

    const isTargetPrivate = preview.isPrivate;

    return (
      <View style={styles.previewContainer}>
        {/* Driving Performance Summary */}
        <View style={styles.previewStatsOverview}>
          <View style={styles.previewStatBox}>
            <Text style={styles.previewStatLabel}>TOTAL DRIVES</Text>
            <Text style={styles.previewStatValue}>{preview.totalTrips}</Text>
          </View>
          <View style={styles.previewStatBox}>
            <Text style={styles.previewStatLabel}>TOTAL DISTANCE</Text>
            <Text style={styles.previewStatValue}>{preview.totalDistanceKm} KM</Text>
          </View>
          <View style={styles.previewStatBox}>
            <Text style={styles.previewStatLabel}>SAFETY AVG</Text>
            <Text style={styles.previewStatValue}>
              {preview.avgSafetyScore != null ? `${preview.avgSafetyScore}%` : '—'}
            </Text>
          </View>
        </View>

        {/* Locked Route Map vs Public Route Map Banner */}
        {isTargetPrivate ? (
          renderLockedMapBanner()
        ) : (
          <View style={styles.publicMapBannerContainer}>
            <View style={styles.publicMapIconCircle}>
              <Globe color="#22C55E" size={15} />
            </View>
            <View style={styles.publicMapContent}>
              <Text style={styles.publicMapTitle}>PUBLIC PROFILE · MAPS UNLOCKED</Text>
              <Text style={styles.publicMapDesc}>
                This driver has a Public Profile. Driven route maps, start/end pins, and playback animation are publicly available.
              </Text>
            </View>
          </View>
        )}

        {/* Recent Drives List */}
        {preview.trips.length === 0 ? (
          <Text style={styles.emptySubtext}>No drives logged yet by this driver.</Text>
        ) : (
          <View style={{ marginTop: Theme.spacing.xs }}>
            <Text style={styles.previewSubLabel}>
              {isTargetPrivate ? 'RECENT DRIVES (DETAILS & SCORES)' : 'RECENT DRIVES (WITH DRIVEN MAPS)'}
            </Text>
            {preview.trips.slice(0, 3).map((trip) => (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.tripCardTopRow}>
                  <Car color={Theme.colors.textMuted} size={14} />
                  <Text style={styles.tripCardDate}>{trip.date}</Text>
                </View>

                {/* For Public Profiles: Render the driven route map! */}
                {!isTargetPrivate && renderCardMap(trip)}

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
                    <Text style={styles.tripStatValue}>
                      {formatSpeed(trip.topSpeed ?? trip.avgSpeed)} KM/H
                    </Text>
                  </View>
                </View>

                {trip.safetyScore != null && trip.smoothnessScore != null && trip.comfortScore != null && (
                  <View style={{ marginTop: Theme.spacing.sm }}>
                    <ScoreBar label="SAFETY" score={trip.safetyScore} />
                    <ScoreBar label="SMOOTHNESS" score={trip.smoothnessScore} />
                    <ScoreBar label="COMFORT" score={trip.comfortScore} />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {isDemoMode && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>
            DEMO MODE — friends only work between accounts registered on this same device.
          </Text>
        </View>
      )}

      {/* Section Tabs */}
      <View style={styles.tabRow}>
        {(
          [
            { key: 'friends', label: `FRIENDS (${friends.length})` },
            { key: 'requests', label: `REQUESTS${incoming.length ? ` (${incoming.length})` : ''}` },
            { key: 'search', label: 'FIND DRIVERS' },
          ] as { key: Section; label: string }[]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, section === tab.key && styles.tabBtnActive]}
            onPress={() => setSection(tab.key)}
          >
            <Text style={[styles.tabBtnText, section === tab.key && styles.tabBtnTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
      >
        {/* =========================================================================
            SECTION 1: FIND DRIVERS (Search & preview everything except driven map)
        ========================================================================== */}
        {section === 'search' && (
          <View>
            <View style={styles.searchBar}>
              <Search color={Theme.colors.textMuted} size={16} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username (e.g. alex)"
                placeholderTextColor={Theme.colors.textMuted}
                autoCapitalize="none"
                value={searchQuery}
                onChangeText={runSearch}
              />
            </View>

            {searching && <ActivityIndicator style={{ marginTop: Theme.spacing.lg }} color={Theme.colors.primary} />}

            {!searching && searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <Text style={styles.emptyText}>No drivers found for "{searchQuery}"</Text>
            )}

            {searchResults.map((user) => {
              const isFriend = friends.some((f) => f.user.email === user.email);
              const isOutgoing = outgoing.some((r) => r.user.email === user.email) || sentRequests.has(user.email);
              const isExpanded = expandedPreviewUser === user.email;

              return (
                <View key={user.email} style={styles.driverCard}>
                  <TouchableOpacity
                    style={styles.driverCardHeader}
                    onPress={() => toggleDriverPreview(user.email, user.isPrivate)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.avatarCircleSmall}>
                      <Text style={styles.avatarInitialSmall}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>

                    <View style={styles.userRowInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.userRowName}>{user.name}</Text>
                        {isExpanded ? (
                          <ChevronUp color={Theme.colors.textMuted} size={16} />
                        ) : (
                          <ChevronDown color={Theme.colors.textMuted} size={16} />
                        )}
                      </View>
                      <Text style={styles.userRowUsername}>@{user.username}</Text>

                      <View style={styles.badgesRow}>
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{user.driverType?.toUpperCase() || 'CASUAL'}</Text>
                        </View>
                        <View style={[styles.badgePill, styles.levelBadgePill]}>
                          <Text style={[styles.badgePillText, styles.levelBadgeText]}>LVL {user.level || 1}</Text>
                        </View>
                        {user.isPrivate === false ? (
                          <View style={[styles.badgePill, styles.publicBadgePill]}>
                            <Globe color="#22C55E" size={9} />
                            <Text style={[styles.badgePillText, styles.publicBadgeText]}>PUBLIC</Text>
                          </View>
                        ) : (
                          <View style={[styles.badgePill, styles.privateBadgePill]}>
                            <Lock color={Theme.colors.textMuted} size={9} />
                            <Text style={[styles.badgePillText, styles.privateBadgeText]}>PRIVATE</Text>
                          </View>
                        )}
                        {user.xp != null && user.xp > 0 && (
                          <Text style={styles.xpSubtext}>{user.xp} XP</Text>
                        )}
                      </View>
                    </View>

                    <View style={{ marginLeft: Theme.spacing.sm }}>
                      {isFriend ? (
                        <View style={styles.statusPill}>
                          <Check color="#22C55E" size={12} />
                          <Text style={styles.statusPillText}>FRIENDS</Text>
                        </View>
                      ) : isOutgoing ? (
                        <View style={styles.statusPill}>
                          <Clock color={Theme.colors.textMuted} size={12} />
                          <Text style={styles.statusPillText}>SENT</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => handleSendRequest(user)}
                          disabled={sendingTo === user.email}
                        >
                          {sendingTo === user.email ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <>
                              <UserPlus color="#000" size={13} />
                              <Text style={styles.addBtnText}>ADD</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Expandable Preview: All stats, driving scores, and locked map */}
                  {isExpanded && renderDriverPreviewSection(user)}
                </View>
              );
            })}
          </View>
        )}

        {/* =========================================================================
            SECTION 2: REQUESTS (Incoming & Outgoing with preview)
        ========================================================================== */}
        {section === 'requests' && (
          <View>
            {incoming.length === 0 && outgoing.length === 0 && (
              <Text style={styles.emptyText}>No pending friend requests.</Text>
            )}

            {incoming.length > 0 && (
              <View>
                <Text style={styles.subsectionLabel}>INCOMING REQUESTS</Text>
                {incoming.map((req) => {
                  const isExpanded = expandedPreviewUser === req.user.email;
                  return (
                    <View key={req.id} style={styles.driverCard}>
                      <TouchableOpacity
                        style={styles.driverCardHeader}
                        onPress={() => toggleDriverPreview(req.user.email, req.user.isPrivate)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.avatarCircleSmall}>
                          <Text style={styles.avatarInitialSmall}>{req.user.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.userRowInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.userRowName}>{req.user.name}</Text>
                            {isExpanded ? (
                              <ChevronUp color={Theme.colors.textMuted} size={16} />
                            ) : (
                              <ChevronDown color={Theme.colors.textMuted} size={16} />
                            )}
                          </View>
                          <Text style={styles.userRowUsername}>@{req.user.username}</Text>
                          <View style={styles.badgesRow}>
                            {req.user.isPrivate === false ? (
                              <View style={[styles.badgePill, styles.publicBadgePill]}>
                                <Globe color="#22C55E" size={9} />
                                <Text style={[styles.badgePillText, styles.publicBadgeText]}>PUBLIC</Text>
                              </View>
                            ) : (
                              <View style={[styles.badgePill, styles.privateBadgePill]}>
                                <Lock color={Theme.colors.textMuted} size={9} />
                                <Text style={[styles.badgePillText, styles.privateBadgeText]}>PRIVATE</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.requestActions}>
                          <TouchableOpacity
                            style={[styles.iconBtn, styles.acceptBtn]}
                            onPress={() => handleRespond(req, true)}
                          >
                            <Check color="#000" size={16} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.iconBtn} onPress={() => handleRespond(req, false)}>
                            <X color={Theme.colors.textMuted} size={16} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>

                      {/* Expandable Preview for incoming requester */}
                      {isExpanded && renderDriverPreviewSection(req.user)}
                    </View>
                  );
                })}
              </View>
            )}

            {outgoing.length > 0 && (
              <View style={{ marginTop: Theme.spacing.lg }}>
                <Text style={styles.subsectionLabel}>SENT REQUESTS</Text>
                {outgoing.map((req) => {
                  const isExpanded = expandedPreviewUser === req.user.email;
                  return (
                    <View key={req.id} style={styles.driverCard}>
                      <TouchableOpacity
                        style={styles.driverCardHeader}
                        onPress={() => toggleDriverPreview(req.user.email)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.avatarCircleSmall}>
                          <Text style={styles.avatarInitialSmall}>{req.user.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.userRowInfo}>
                          <Text style={styles.userRowName}>{req.user.name}</Text>
                          <Text style={styles.userRowUsername}>@{req.user.username}</Text>
                        </View>
                        <Text style={styles.pendingLabel}>PENDING</Text>
                      </TouchableOpacity>

                      {/* Expandable Preview for outgoing requester */}
                      {isExpanded && renderDriverPreviewSection(req.user)}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            SECTION 3: ACCEPTED FRIENDS (Full route map & trip playback)
        ========================================================================== */}
        {section === 'friends' && (
          <View>
            {friends.length === 0 && (
              <View style={styles.emptyStateBox}>
                <Users color={Theme.colors.textMuted} size={28} />
                <Text style={styles.emptyText}>
                  No friends yet. Search for a driver's username in "FIND DRIVERS" to send a request.
                </Text>
              </View>
            )}

            {friends.map(({ friendshipId, user }) => {
              const isExpanded = expandedFriend === user.email;
              const trips = friendTrips[user.email];
              return (
                <View key={friendshipId} style={styles.friendCard}>
                  <TouchableOpacity
                    style={styles.friendCardHeader}
                    onPress={() => toggleFriendTrips(user.email)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.avatarCircleSmall}>
                      <Text style={styles.avatarInitialSmall}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userRowInfo}>
                      <Text style={styles.userRowName}>{user.name}</Text>
                      <Text style={styles.userRowUsername}>@{user.username}</Text>
                      <View style={styles.badgesRow}>
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{user.driverType?.toUpperCase() || 'CASUAL'}</Text>
                        </View>
                        <View style={[styles.badgePill, styles.levelBadgePill]}>
                          <Text style={[styles.badgePillText, styles.levelBadgeText]}>LVL {user.level || 1}</Text>
                        </View>
                        {user.isPrivate === false ? (
                          <View style={[styles.badgePill, styles.publicBadgePill]}>
                            <Globe color="#22C55E" size={9} />
                            <Text style={[styles.badgePillText, styles.publicBadgeText]}>PUBLIC</Text>
                          </View>
                        ) : (
                          <View style={[styles.badgePill, styles.privateBadgePill]}>
                            <Lock color={Theme.colors.textMuted} size={9} />
                            <Text style={[styles.badgePillText, styles.privateBadgeText]}>PRIVATE</Text>
                          </View>
                        )}
                        {user.xp != null && user.xp > 0 && (
                          <Text style={styles.xpSubtext}>{user.xp} XP</Text>
                        )}
                      </View>
                    </View>
                    {isExpanded ? (
                      <ChevronUp color={Theme.colors.textMuted} size={18} />
                    ) : (
                      <ChevronDown color={Theme.colors.textMuted} size={18} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.friendTripsContainer}>
                      {loadingTripsFor === user.email && (
                        <ActivityIndicator color={Theme.colors.primary} style={{ marginVertical: Theme.spacing.md }} />
                      )}
                      {trips && (
                        <>
                          {/* Driving Performance Summary */}
                          <View style={styles.previewStatsOverview}>
                            <View style={styles.previewStatBox}>
                              <Text style={styles.previewStatLabel}>TOTAL DRIVES</Text>
                              <Text style={styles.previewStatValue}>{trips.length}</Text>
                            </View>
                            <View style={styles.previewStatBox}>
                              <Text style={styles.previewStatLabel}>TOTAL DISTANCE</Text>
                              <Text style={styles.previewStatValue}>
                                {Math.round(trips.reduce((acc, t) => acc + (t.distance || 0), 0) * 10) / 10} KM
                              </Text>
                            </View>
                            <View style={styles.previewStatBox}>
                              <Text style={styles.previewStatLabel}>SAFETY AVG</Text>
                              <Text style={styles.previewStatValue}>
                                {(() => {
                                  const scored = trips.filter((t) => t.safetyScore != null);
                                  return scored.length > 0
                                    ? `${Math.round(scored.reduce((acc, t) => acc + (t.safetyScore || 0), 0) / scored.length)}%`
                                    : '—';
                                })()}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.previewSubLabel}>
                            SHARED DRIVES (WITH DRIVEN MAPS)
                          </Text>
                        </>
                      )}
                      {trips && trips.length === 0 && (
                        <Text style={styles.emptyText}>No trips shared yet.</Text>
                      )}
                      {trips?.slice(0, 5).map((trip) => (
                        <View key={trip.id} style={styles.tripCard}>
                          <View style={styles.tripCardTopRow}>
                            <Car color={Theme.colors.textMuted} size={14} />
                            <Text style={styles.tripCardDate}>{trip.date}</Text>
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
                              <Text style={styles.tripStatValue}>
                                {formatSpeed(trip.topSpeed ?? trip.avgSpeed)} KM/H
                              </Text>
                            </View>
                          </View>
                          {trip.safetyScore != null && trip.smoothnessScore != null && trip.comfortScore != null && (
                            <View style={{ marginTop: Theme.spacing.sm }}>
                              <ScoreBar label="SAFETY" score={trip.safetyScore} />
                              <ScoreBar label="SMOOTHNESS" score={trip.smoothnessScore} />
                              <ScoreBar label="COMFORT" score={trip.comfortScore} />
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
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
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoBanner: {
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    padding: Theme.spacing.sm,
  },
  demoBannerText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: Theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Theme.colors.primary,
  },
  tabBtnText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tabBtnTextActive: {
    color: Theme.colors.textPrimary,
  },
  container: {
    padding: Theme.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: Theme.spacing.md,
    height: 44,
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    color: Theme.colors.textPrimary,
    marginLeft: Theme.spacing.sm,
    fontSize: 13,
  },
  emptyStateBox: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    lineHeight: 18,
  },
  emptySubtext: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginVertical: Theme.spacing.sm,
  },
  driverCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.sm,
    overflow: 'hidden',
  },
  driverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  userRowInfo: {
    flex: 1,
  },
  userRowName: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  userRowUsername: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: Theme.borderRadius.sm,
  },
  addBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: Theme.borderRadius.sm,
    gap: 4,
  },
  statusPillText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subsectionLabel: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: Theme.spacing.sm,
  },
  requestActions: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Theme.spacing.sm,
  },
  acceptBtn: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  pendingLabel: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  friendCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.sm,
    overflow: 'hidden',
  },
  friendCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  friendTripsContainer: {
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
    padding: Theme.spacing.md,
  },
  tripCard: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tripCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  tripCardDate: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginLeft: 6,
  },
  tripStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  tripStatLabel: {
    color: Theme.colors.textMuted,
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tripStatValue: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  cardMapContainer: {
    height: 160,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    position: 'relative',
    marginBottom: Theme.spacing.sm,
    backgroundColor: '#000000',
  },
  playbackBtnOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
    elevation: 3,
  },
  playbackBtnText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  nativeCardMap: {
    width: '100%',
    height: '100%',
  },
  avatarCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  avatarInitialSmall: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badgePill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillText: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  levelBadgePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  levelBadgeText: {
    color: Theme.colors.textPrimary,
  },
  xpSubtext: {
    color: Theme.colors.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Driver Preview (Pre-Friendship) Styles
  previewContainer: {
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
    padding: Theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  previewStatsOverview: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  previewStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  previewStatLabel: {
    color: Theme.colors.textMuted,
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  previewStatValue: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  previewSubLabel: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: Theme.spacing.xs,
  },
  lockedMapContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  lockedMapIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
  },
  lockedMapContent: {
    flex: 1,
  },
  lockedMapTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  lockedMapDesc: {
    color: Theme.colors.textMuted,
    fontSize: 8.5,
    lineHeight: 12,
    marginTop: 2,
  },
  publicBadgePill: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  publicBadgeText: {
    color: '#22C55E',
  },
  privateBadgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  privateBadgeText: {
    color: Theme.colors.textMuted,
  },
  publicMapBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  publicMapIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
  },
  publicMapContent: {
    flex: 1,
  },
  publicMapTitle: {
    color: '#22C55E',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  publicMapDesc: {
    color: Theme.colors.textSecondary,
    fontSize: 8.5,
    lineHeight: 12,
    marginTop: 2,
  },
});
