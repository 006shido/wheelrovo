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
} from 'react-native';
import { Search, UserPlus, Check, X, Users, ChevronDown, ChevronUp, Car } from 'lucide-react-native';
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
  FriendRequestView,
} from '../utils/friends';
import { formatDistance, formatDuration, formatSpeed } from '../utils/stats';
import ScoreBar from '../components/ScoreBar';

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

  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [friendTrips, setFriendTrips] = useState<Record<string, Trip[]>>({});
  const [loadingTripsFor, setLoadingTripsFor] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const user = await getCurrentUser();
    setCurrentUserState(user);
    if (!user) {
      setLoading(false);
      return;
    }
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
      setSearchResults((prev) => prev.filter((u) => u.email !== target.email));
      await loadAll();
    }
    // Silent-ish feedback via inline state below is enough for "already sent" /
    // "already friends" cases; a toast library isn't part of this project yet.
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
        {section === 'search' && (
          <View>
            <View style={styles.searchBar}>
              <Search color={Theme.colors.textMuted} size={16} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username"
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

            {searchResults.map((user) => (
              <View key={user.email} style={styles.userRow}>
                <View style={styles.userRowInfo}>
                  <Text style={styles.userRowName}>{user.name}</Text>
                  <Text style={styles.userRowUsername}>@{user.username}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleSendRequest(user)}
                  disabled={sendingTo === user.email}
                >
                  {sendingTo === user.email ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <UserPlus color="#000" size={14} />
                      <Text style={styles.addBtnText}>ADD</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {section === 'requests' && (
          <View>
            {incoming.length === 0 && outgoing.length === 0 && (
              <Text style={styles.emptyText}>No pending friend requests.</Text>
            )}

            {incoming.length > 0 && (
              <View>
                <Text style={styles.subsectionLabel}>INCOMING</Text>
                {incoming.map((req) => (
                  <View key={req.id} style={styles.userRow}>
                    <View style={styles.userRowInfo}>
                      <Text style={styles.userRowName}>{req.user.name}</Text>
                      <Text style={styles.userRowUsername}>@{req.user.username}</Text>
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
                  </View>
                ))}
              </View>
            )}

            {outgoing.length > 0 && (
              <View style={{ marginTop: Theme.spacing.lg }}>
                <Text style={styles.subsectionLabel}>SENT</Text>
                {outgoing.map((req) => (
                  <View key={req.id} style={styles.userRow}>
                    <View style={styles.userRowInfo}>
                      <Text style={styles.userRowName}>{req.user.name}</Text>
                      <Text style={styles.userRowUsername}>@{req.user.username}</Text>
                    </View>
                    <Text style={styles.pendingLabel}>PENDING</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {section === 'friends' && (
          <View>
            {friends.length === 0 && (
              <View style={styles.emptyStateBox}>
                <Users color={Theme.colors.textMuted} size={28} />
                <Text style={styles.emptyText}>
                  No friends yet. Search for a driver's username to send a request.
                </Text>
              </View>
            )}

            {friends.map(({ friendshipId, user }) => {
              const isExpanded = expandedFriend === user.email;
              const trips = friendTrips[user.email];
              return (
                <View key={friendshipId} style={styles.friendCard}>
                  <TouchableOpacity style={styles.friendCardHeader} onPress={() => toggleFriendTrips(user.email)}>
                    <View style={styles.userRowInfo}>
                      <Text style={styles.userRowName}>{user.name}</Text>
                      <Text style={styles.userRowUsername}>@{user.username}</Text>
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
                      {trips && trips.length === 0 && (
                        <Text style={styles.emptyText}>No trips shared yet.</Text>
                      )}
                      {trips?.slice(0, 5).map((trip) => (
                        <View key={trip.id} style={styles.tripCard}>
                          <View style={styles.tripCardTopRow}>
                            <Car color={Theme.colors.textMuted} size={14} />
                            <Text style={styles.tripCardDate}>{trip.date}</Text>
                          </View>
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
    fontSize: 9,
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
    paddingHorizontal: Theme.spacing.sm,
    height: 42,
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    color: Theme.colors.textPrimary,
    fontSize: 13,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyStateBox: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
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
    paddingHorizontal: Theme.spacing.sm,
    height: 32,
    borderRadius: Theme.borderRadius.sm,
  },
  addBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 6,
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
    justifyContent: 'space-between',
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
});
