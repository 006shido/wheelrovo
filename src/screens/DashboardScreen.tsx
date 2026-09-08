import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Flame,
  Trophy,
  CheckCircle,
  Star,
  Lock,
  Gauge,
  Route,
  Crown,
  Globe,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Check,
  Clock,
  Car,
  Play,
  Users,
} from 'lucide-react-native';
import { Theme } from '../styles/theme';
import {
  loadDriverState,
  loadCompletedTasks,
  loadTrips,
  getCurrentUser,
  DriverState,
  UserProfile,
  Trip,
} from '../utils/storage';
import { DEFAULT_TASKS, MILESTONES, Task } from '../utils/mockData';
import { computeAchievementProgress, AchievementProgress } from '../utils/achievements';
import {
  getLeaderboard,
  LeaderboardEntry,
  getFriends,
  getDriverPreview,
  DriverPreviewData,
  sendFriendRequest,
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

interface DashboardScreenProps {
  refreshTrigger?: number;
}

export default function DashboardScreen({ refreshTrigger }: DashboardScreenProps) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [driverState, setDriverState] = useState<DriverState>({
    xp: 0,
    level: 1,
    streak: 0,
    lastLoginDate: null,
  });
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [lastTripKm, setLastTripKm] = useState<number | null>(null);
  const [totalTrips, setTotalTrips] = useState(0);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardMode, setLeaderboardMode] = useState<'xp' | 'distance'>('xp');
  const [leaderboardScope, setLeaderboardScope] = useState<'global' | 'friends'>('global');

  const [expandedDriverEmail, setExpandedDriverEmail] = useState<string | null>(null);
  const [driverPreviews, setDriverPreviews] = useState<Record<string, DriverPreviewData>>({});
  const [loadingPreviewFor, setLoadingPreviewFor] = useState<string | null>(null);
  const [friendsList, setFriendsList] = useState<{ friendshipId: string; user: UserProfile }[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [playbackTriggers, setPlaybackTriggers] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);

  const triggerPlayback = (tripId: string) => {
    setPlaybackTriggers((prev) => ({
      ...prev,
      [tripId]: (prev[tripId] || 0) + 1,
    }));
  };

  const loadLeaderboardData = useCallback(async (user: UserProfile) => {
    const board = await getLeaderboard(user, leaderboardScope);
    setLeaderboard(board);
    const friends = await getFriends(user.email);
    setFriendsList(friends);
  }, [leaderboardScope]);

  const fetchData = async () => {
    setLoading(true);
    const state = await loadDriverState();
    const completedTaskIds = await loadCompletedTasks();

    const todayStr = new Date().toDateString();
    const checkedInToday = state.lastLoginDate === todayStr;

    const updatedTasks = DEFAULT_TASKS.map((task) => {
      let isCompleted = completedTaskIds.includes(task.id);
      if (task.type === 'login' && checkedInToday) {
        isCompleted = true;
      }
      return { ...task, completed: isCompleted };
    });

    const trips = await loadTrips();
    setAchievements(computeAchievementProgress(trips));
    setTotalTrips(trips.length);
    setLastTripKm(trips.length > 0 ? trips[0].distance : null);

    const activeUser = await getCurrentUser();
    setCurrentUser(activeUser);
    if (activeUser) {
      await loadLeaderboardData(activeUser);
    }

    setDriverState(state);
    setTasks(updatedTasks);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  useEffect(() => {
    if (currentUser) {
      loadLeaderboardData(currentUser);
    }
  }, [leaderboardScope, loadLeaderboardData]);

  const toggleDriverPreview = async (driverEmail: string, knownIsPrivate?: boolean) => {
    const formattedEmail = driverEmail.trim().toLowerCase();
    if (expandedDriverEmail === formattedEmail) {
      setExpandedDriverEmail(null);
      return;
    }
    setExpandedDriverEmail(formattedEmail);
    if (!driverPreviews[formattedEmail]) {
      setLoadingPreviewFor(formattedEmail);
      const preview = await getDriverPreview(formattedEmail, knownIsPrivate);
      setDriverPreviews((prev) => ({ ...prev, [formattedEmail]: preview }));
      setLoadingPreviewFor(null);
    }
  };

  const handleSendFriendRequest = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    setSendingTo(targetUser.email);
    const res = await sendFriendRequest(currentUser.email, targetUser.username);
    setSendingTo(null);
    if (res.success) {
      setSentRequests((prev) => new Set(prev).add(targetUser.email.toLowerCase()));
      const updatedFriends = await getFriends(currentUser.email);
      setFriendsList(updatedFriends);
    }
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

  const currentMilestone = MILESTONES.find((m) => m.level === driverState.level) || MILESTONES[0];
  const nextMilestone = MILESTONES.find((m) => m.level === driverState.level + 1) || null;

  const xpProgress = nextMilestone
    ? (driverState.xp - currentMilestone.xpRequired) /
      (nextMilestone.xpRequired - currentMilestone.xpRequired)
    : 1;

  const currentLevelXp = driverState.xp - currentMilestone.xpRequired;
  const nextLevelXpRequired = nextMilestone
    ? nextMilestone.xpRequired - currentMilestone.xpRequired
    : 0;

  const isCheckedInToday = driverState.lastLoginDate === new Date().toDateString();

  const sortedLeaderboard = [...leaderboard].sort((a, b) =>
    leaderboardMode === 'xp' ? b.xp - a.xp : b.totalDistanceKm - a.totalDistanceKm
  );

  const selfIndex = sortedLeaderboard.findIndex((e) => e.isSelf);
  const selfRank = selfIndex !== -1 ? selfIndex + 1 : null;
  const topVisibleEntries = sortedLeaderboard.slice(0, 10);
  const isSelfOutsideTop10 = selfIndex >= 10;

  const renderDriverInspection = (entry: LeaderboardEntry) => {
    const email = entry.user.email.toLowerCase();
    const isLoading = loadingPreviewFor === email;
    const preview = driverPreviews[email];
    const isFriend = friendsList.some((f) => f.user.email.toLowerCase() === email);
    const isSent = sentRequests.has(email);
    const isTargetPrivate = preview?.isPrivate ?? (entry.user.isPrivate !== false);
    const canSeeMaps = entry.isSelf || isFriend || !isTargetPrivate;

    return (
      <View style={styles.detailDrawer}>
        <View style={styles.drawerHeaderRow}>
          <View style={styles.drawerBadgesRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{entry.user.driverType?.toUpperCase() || 'CASUAL'}</Text>
            </View>
            <View style={[styles.badgePill, styles.levelBadgePill]}>
              <Text style={[styles.badgePillText, styles.levelBadgeText]}>LVL {entry.level || 1}</Text>
            </View>
            {!isTargetPrivate ? (
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

          <View>
            {entry.isSelf ? (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>YOU</Text>
              </View>
            ) : isFriend ? (
              <View style={styles.statusPill}>
                <Check color="#22C55E" size={12} />
                <Text style={styles.statusPillText}>FRIENDS</Text>
              </View>
            ) : isSent ? (
              <View style={styles.statusPill}>
                <Clock color={Theme.colors.textMuted} size={12} />
                <Text style={styles.statusPillText}>SENT</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleSendFriendRequest(entry.user)}
                disabled={sendingTo === entry.user.email}
              >
                {sendingTo === entry.user.email ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <UserPlus color="#000" size={12} />
                    <Text style={styles.addBtnText}>ADD FRIEND</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginVertical: Theme.spacing.md }} />
        ) : preview ? (
          <>
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

            {!canSeeMaps ? (
              <View style={styles.lockedMapBanner}>
                <View style={styles.lockedMapIconCircle}>
                  <Lock color={Theme.colors.textMuted} size={14} />
                </View>
                <View style={styles.lockedMapContent}>
                  <Text style={styles.lockedMapTitle}>DRIVEN ROUTE MAP LOCKED</Text>
                  <Text style={styles.lockedMapDesc}>
                    GPS route coordinates and map playback are strictly private. Once friend request is accepted, map routes unlock.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.publicMapBannerContainer}>
                <View style={styles.publicMapIconCircle}>
                  <Globe color="#22C55E" size={14} />
                </View>
                <View style={styles.publicMapContent}>
                  <Text style={styles.publicMapTitle}>
                    {entry.isSelf
                      ? 'YOUR DRIVES · MAPS UNLOCKED'
                      : isFriend
                      ? 'FRIEND ROUTE UNLOCKED'
                      : 'PUBLIC PROFILE · MAPS UNLOCKED'}
                  </Text>
                  <Text style={styles.publicMapDesc}>
                    {entry.isSelf
                      ? 'Your tracked routes with interactive playback.'
                      : isFriend
                      ? 'Connected friends can view driven route maps and playback.'
                      : 'This driver has a public profile. Driven route maps and playback are public.'}
                  </Text>
                </View>
              </View>
            )}

            {canSeeMaps && preview.trips.length > 0 && preview.trips[0].coordinates?.length > 0 && (
              <View style={{ marginTop: Theme.spacing.xs }}>
                {renderCardMap(preview.trips[0])}
              </View>
            )}

            {preview.trips.length === 0 ? (
              <Text style={styles.emptySubtext}>No drives logged yet by this driver.</Text>
            ) : (
              <View style={{ marginTop: Theme.spacing.xs }}>
                <Text style={styles.previewSubLabel}>
                  {canSeeMaps ? 'RECENT DRIVES (WITH PERFORMANCE)' : 'RECENT DRIVES (DETAILS & SCORES)'}
                </Text>
                {preview.trips.slice(0, 2).map((trip) => (
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
          </>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <Route color={Theme.colors.primary} size={18} />
            <Text style={styles.quickStatValue}>
              {lastTripKm != null ? `${formatDistance(lastTripKm)} KM` : '—'}
            </Text>
            <Text style={styles.quickStatLabel}>LAST TRIP</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Gauge color={Theme.colors.primary} size={18} />
            <Text style={styles.quickStatValue}>{totalTrips}</Text>
            <Text style={styles.quickStatLabel}>TOTAL TRIPS</Text>
          </View>
        </View>

        <View style={styles.leaderboardCard}>
          <View style={styles.leaderboardHeader}>
            <View style={styles.settingsHeaderLeft}>
              <Crown color={leaderboardScope === 'global' ? '#F59E0B' : Theme.colors.primary} size={18} />
              <Text style={styles.sectionHeader}>LEADERBOARD</Text>
            </View>

            <View style={styles.leaderboardToggle}>
              <TouchableOpacity
                style={[styles.leaderboardToggleBtn, leaderboardScope === 'global' && styles.leaderboardToggleBtnActive]}
                onPress={() => setLeaderboardScope('global')}
              >
                <Text
                  style={[
                    styles.leaderboardToggleText,
                    leaderboardScope === 'global' && styles.leaderboardToggleTextActive,
                  ]}
                >
                  GLOBAL
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.leaderboardToggleBtn, leaderboardScope === 'friends' && styles.leaderboardToggleBtnActive]}
                onPress={() => setLeaderboardScope('friends')}
              >
                <Text
                  style={[
                    styles.leaderboardToggleText,
                    leaderboardScope === 'friends' && styles.leaderboardToggleTextActive,
                  ]}
                >
                  FRIENDS
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.leaderboardSubHeader}>
            <Text style={styles.leaderboardScopeDesc}>
              {leaderboardScope === 'global' ? 'TOP DRIVERS IN WHEELROVO' : 'FRIENDS COMPARISON'}
            </Text>

            <View style={styles.leaderboardMetricToggle}>
              <TouchableOpacity
                style={[styles.metricToggleBtn, leaderboardMode === 'xp' && styles.metricToggleBtnActive]}
                onPress={() => setLeaderboardMode('xp')}
              >
                <Text
                  style={[
                    styles.metricToggleText,
                    leaderboardMode === 'xp' && styles.metricToggleTextActive,
                  ]}
                >
                  LEVEL
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.metricToggleBtn, leaderboardMode === 'distance' && styles.metricToggleBtnActive]}
                onPress={() => setLeaderboardMode('distance')}
              >
                <Text
                  style={[
                    styles.metricToggleText,
                    leaderboardMode === 'distance' && styles.metricToggleTextActive,
                  ]}
                >
                  DISTANCE
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {sortedLeaderboard.length === 0 ? (
            <Text style={styles.leaderboardEmptyText}>
              {leaderboardScope === 'friends'
                ? 'Add friends from Profile → Friends to see how you compare.'
                : 'No drivers found.'}
            </Text>
          ) : leaderboardScope === 'friends' && sortedLeaderboard.length <= 1 ? (
            <View style={styles.friendsEmptyNoticeBox}>
              <Users color={Theme.colors.textMuted} size={22} />
              <Text style={styles.leaderboardEmptyText}>
                Add friends from Profile → Friends to see your friends leaderboard.
              </Text>
            </View>
          ) : (
            <>
              {topVisibleEntries.map((entry, index) => {
                const rank = index + 1;
                const isExpanded = expandedDriverEmail === entry.user.email.toLowerCase();
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;

                return (
                  <View key={entry.user.email} style={styles.leaderboardItemContainer}>
                    <TouchableOpacity
                      style={[
                        styles.leaderboardRow,
                        entry.isSelf && styles.leaderboardRowSelf,
                        isExpanded && styles.leaderboardRowExpanded,
                      ]}
                      onPress={() => toggleDriverPreview(entry.user.email, entry.user.isPrivate)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.rankBadge,
                          isTop1 && styles.rankBadge1,
                          isTop2 && styles.rankBadge2,
                          isTop3 && styles.rankBadge3,
                        ]}
                      >
                        {isTop1 ? (
                          <Crown size={11} color="#000" />
                        ) : (
                          <Text
                            style={[
                              styles.rankBadgeText,
                              (isTop1 || isTop2 || isTop3) && styles.rankBadgeTextPodium,
                            ]}
                          >
                            #{rank}
                          </Text>
                        )}
                      </View>

                      <View style={styles.leaderboardNameBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.leaderboardName} numberOfLines={1}>
                            {entry.isSelf ? 'You' : entry.user.name}
                          </Text>
                          {entry.isSelf && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>YOU</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.leaderboardUsername}>@{entry.user.username}</Text>
                      </View>

                      <View style={styles.leaderboardRightBox}>
                        <Text style={styles.leaderboardValue}>
                          {leaderboardMode === 'xp'
                            ? `Lvl ${entry.level} · ${entry.xp} XP`
                            : `${formatDistance(entry.totalDistanceKm)} KM`}
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={15} color={Theme.colors.textMuted} style={{ marginLeft: 6 }} />
                        ) : (
                          <ChevronDown size={15} color={Theme.colors.textMuted} style={{ marginLeft: 6 }} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && renderDriverInspection(entry)}
                  </View>
                );
              })}

              {isSelfOutsideTop10 && selfIndex !== -1 && (
                <View style={styles.outsideTop10Container}>
                  <View style={styles.dividerRow}>
                    <Text style={styles.dividerDots}>· · ·</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.leaderboardRow, styles.leaderboardRowSelf]}
                    onPress={() => toggleDriverPreview(sortedLeaderboard[selfIndex].user.email)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>#{selfRank}</Text>
                    </View>
                    <View style={styles.leaderboardNameBox}>
                      <Text style={styles.leaderboardName}>You (Your Rank)</Text>
                      <Text style={styles.leaderboardUsername}>@{sortedLeaderboard[selfIndex].user.username}</Text>
                    </View>
                    <View style={styles.leaderboardRightBox}>
                      <Text style={styles.leaderboardValue}>
                        {leaderboardMode === 'xp'
                          ? `Lvl ${sortedLeaderboard[selfIndex].level} · ${sortedLeaderboard[selfIndex].xp} XP`
                          : `${formatDistance(sortedLeaderboard[selfIndex].totalDistanceKm)} KM`}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {expandedDriverEmail === sortedLeaderboard[selfIndex].user.email.toLowerCase() &&
                    renderDriverInspection(sortedLeaderboard[selfIndex])}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.levelCard}>
          <View style={styles.levelContainer}>
            <View style={styles.levelRow}>
              <View style={styles.levelBadgeContainer}>
                <Trophy color="#000" size={12} fill="#000" />
                <Text style={styles.levelNumberText}>Lvl {driverState.level}</Text>
              </View>
              <Text style={styles.milestoneTitle}>{currentMilestone.title.toUpperCase()}</Text>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${xpProgress * 100}%` }]} />
            </View>

            <View style={styles.xpTextRow}>
              <Text style={styles.xpText}>
                {driverState.xp} TOTAL XP
              </Text>
              {nextMilestone ? (
                <Text style={styles.xpNeededText}>
                  {nextLevelXpRequired - currentLevelXp} XP TO LEVEL {driverState.level + 1}
                </Text>
              ) : (
                <Text style={styles.xpNeededText}>MAX LEVEL</Text>
              )}
            </View>
          </View>
        </View>

        {/* Daily Streak Card (Automated via driving) */}
        <View
          style={[
            styles.streakCard,
            isCheckedInToday && styles.streakCardActive,
          ]}
        >
          <View style={styles.streakLeft}>
            <View style={[styles.fireBg, isCheckedInToday && styles.fireBgActive]}>
              <Flame
                color={isCheckedInToday ? '#000000' : Theme.colors.primary}
                size={22}
                fill={isCheckedInToday ? '#000000' : 'none'}
              />
            </View>
            <View style={styles.streakTextContainer}>
              <Text style={styles.streakTitle}>{driverState.streak} DAY STREAK</Text>
              <Text style={styles.streakSubtitle}>
                {isCheckedInToday
                  ? 'CHECK-IN SECURED FOR TODAY'
                  : 'DRIVE 1 TIME TODAY TO SECURE STREAK'}
              </Text>
            </View>
          </View>
          <View style={styles.streakAction}>
            {isCheckedInToday ? (
              <View style={styles.securedBadge}>
                <Text style={styles.securedBadgeText}>SECURED</Text>
              </View>
            ) : (
              <View style={[styles.securedBadge, { borderColor: Theme.colors.border }]}>
                <Text style={[styles.securedBadgeText, { color: Theme.colors.textMuted }]}>INCOMPLETE</Text>
              </View>
            )}
          </View>
        </View>

        {/* Daily Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionHeader}>DAILY DRIVER TASKS</Text>

          {tasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                    {task.title.toUpperCase()}
                  </Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                </View>
                {task.completed ? (
                  <View style={styles.checkedBox}>
                    <CheckCircle color={Theme.colors.primary} size={20} fill="#FFF" />
                  </View>
                ) : (
                  <View style={styles.taskUncheck}>
                    <Star color={Theme.colors.textMuted} size={10} />
                  </View>
                )}
              </View>

              <View style={styles.taskFooter}>
                <View style={styles.xpRewardTag}>
                  <Text style={styles.xpRewardText}>+{task.rewardXp} XP</Text>
                </View>
                <Text style={[styles.taskStatusText, task.completed && { color: '#FFF' }]}>
                  {task.completed ? 'COMPLETED' : 'ACTIVE'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Lifetime Achievements */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionHeader}>ACHIEVEMENTS</Text>

          {achievements.map(({ achievement, unlocked, value, target, progress }) => (
            <View
              key={achievement.id}
              style={[styles.achievementCard, unlocked && styles.achievementCardUnlocked]}
            >
              <View style={styles.taskHeader}>
                <View style={styles.taskInfo}>
                  <View style={styles.achievementTitleRow}>
                    <Text style={[styles.taskTitle, !unlocked && styles.achievementTitleLocked]}>
                      {achievement.title.toUpperCase()}
                    </Text>
                    <View style={styles.tierBadge}>
                      <Text style={styles.tierBadgeText}>{achievement.tier.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.taskDescription}>{achievement.description}</Text>
                </View>
                {unlocked ? (
                  <Trophy color={Theme.colors.primary} size={18} fill={Theme.colors.primary} />
                ) : (
                  <Lock color={Theme.colors.textMuted} size={16} />
                )}
              </View>

              {!unlocked && (
                <View style={styles.achievementProgressRow}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.achievementProgressText}>
                    {Math.min(value, target)}/{target}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    padding: Theme.spacing.md,
  },
  levelCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  levelContainer: {
    marginTop: Theme.spacing.xs,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  levelBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.sm,
    marginRight: Theme.spacing.sm,
  },
  levelNumberText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 10,
  },
  milestoneTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#000000',
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    marginBottom: Theme.spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.primary,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    color: Theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  xpNeededText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  streakCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  streakCardActive: {
    borderColor: Theme.colors.borderActive,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fireBg: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  fireBgActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  streakTextContainer: {
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  streakTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  streakSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    lineHeight: 12,
  },
  streakAction: {
    marginLeft: Theme.spacing.sm,
  },
  securedBadge: {
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: '#000',
  },
  securedBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  checkInButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  checkInButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 10,
  },
  tasksSection: {
    marginTop: Theme.spacing.xs,
  },
  sectionHeader: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.md,
    letterSpacing: 1,
  },
  quickStatsRow: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    marginRight: Theme.spacing.sm,
  },
  quickStatValue: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: Theme.spacing.xs,
  },
  quickStatLabel: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  leaderboardCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  settingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leaderboardToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    overflow: 'hidden',
  },
  leaderboardToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: Theme.spacing.sm,
  },
  leaderboardToggleBtnActive: {
    backgroundColor: Theme.colors.primary,
  },
  leaderboardToggleText: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
  },
  leaderboardToggleTextActive: {
    color: '#000',
  },
  leaderboardSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  leaderboardScopeDesc: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  leaderboardMetricToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  metricToggleBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricToggleBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: Theme.colors.borderActive,
  },
  metricToggleText: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  metricToggleTextActive: {
    color: Theme.colors.textPrimary,
  },
  leaderboardEmptyText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: Theme.spacing.md,
  },
  friendsEmptyNoticeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.lg,
    gap: 6,
  },
  leaderboardItemContainer: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  leaderboardRowSelf: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Theme.borderRadius.sm,
  },
  leaderboardRowExpanded: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
  },
  rankBadge1: {
    backgroundColor: '#F59E0B',
  },
  rankBadge2: {
    backgroundColor: '#94A3B8',
  },
  rankBadge3: {
    backgroundColor: '#D97706',
  },
  rankBadgeText: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
  },
  rankBadgeTextPodium: {
    color: '#000000',
    fontWeight: '900',
  },
  leaderboardNameBox: {
    flex: 1,
    marginRight: 8,
  },
  leaderboardName: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  youBadge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 6,
  },
  youBadgeText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '900',
  },
  leaderboardUsername: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    marginTop: 1,
  },
  leaderboardRightBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardValue: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  outsideTop10Container: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    marginTop: 4,
  },
  dividerRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dividerDots: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    letterSpacing: 4,
  },
  detailDrawer: {
    paddingHorizontal: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: Theme.borderRadius.sm,
    borderBottomRightRadius: Theme.borderRadius.sm,
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  drawerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badgePill: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgePillText: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  levelBadgePill: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  levelBadgeText: {
    color: Theme.colors.textPrimary,
  },
  publicBadgePill: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  publicBadgeText: {
    color: '#22C55E',
  },
  privateBadgePill: {
    borderColor: Theme.colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  privateBadgeText: {
    color: Theme.colors.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  statusPillText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  addBtnText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  previewStatsOverview: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: Theme.spacing.sm,
  },
  previewStatBox: {
    flex: 1,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: 8,
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
  lockedMapBanner: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
    alignItems: 'center',
    gap: 8,
    marginVertical: Theme.spacing.xs,
  },
  lockedMapIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 8,
    marginTop: 2,
    lineHeight: 11,
  },
  publicMapBannerContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
    alignItems: 'center',
    gap: 8,
    marginVertical: Theme.spacing.xs,
  },
  publicMapIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: Theme.colors.textMuted,
    fontSize: 8,
    marginTop: 2,
    lineHeight: 11,
  },
  cardMapContainer: {
    height: 160,
    borderRadius: Theme.borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    position: 'relative',
    marginVertical: Theme.spacing.xs,
    backgroundColor: '#000',
  },
  playbackBtnOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    elevation: 3,
  },
  playbackBtnText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  nativeCardMap: {
    width: '100%',
    height: '100%',
  },
  tripCard: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
    marginTop: 6,
  },
  tripCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tripCardDate: {
    color: Theme.colors.textMuted,
    fontSize: 9,
  },
  tripStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
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
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptySubtext: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    marginVertical: Theme.spacing.sm,
  },
  previewSubLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  taskCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskInfo: {
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  taskTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Theme.colors.textMuted,
  },
  taskDescription: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  checkedBox: {
    marginTop: 2,
  },
  taskUncheck: {
    width: 20,
    height: 20,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: '#000',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
  },
  xpRewardTag: {
    backgroundColor: '#000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  xpRewardText: {
    color: Theme.colors.textPrimary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  taskStatusText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  achievementCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    opacity: 0.7,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderColor: Theme.colors.borderActive,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementTitleLocked: {
    color: Theme.colors.textMuted,
  },
  tierBadge: {
    marginLeft: Theme.spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tierBadgeText: {
    color: Theme.colors.textMuted,
    fontSize: 7,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  achievementProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
  },
  achievementProgressText: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: Theme.spacing.sm,
  },
});
