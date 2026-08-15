import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Theme } from './src/styles/theme';
import DashboardScreen from './src/screens/DashboardScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AuthScreen from './src/screens/AuthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { LayoutGrid, Navigation, History, Compass, User } from 'lucide-react-native';
import { getCurrentUser, setCurrentUser, UserProfile } from './src/utils/storage';
import { reconcileTripsOnLaunch } from './src/services/locationTask';
import { startPeriodicSync } from './src/services/sync';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracking' | 'history' | 'profile'>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUser, setSessionUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check auth session on startup
  useEffect(() => {
    (async () => {
      // Close out any trip left "active" by a killed background process
      // before the tracking UI can render and get confused by it.
      await reconcileTripsOnLaunch();
      const user = await getCurrentUser();
      setSessionUser(user);
      setAuthLoading(false);
    })();
  }, []);

  // Periodic sync of buffered trip points runs for as long as someone is
  // logged in, independent of which tab is open, and stops cleanly on logout.
  useEffect(() => {
    if (!currentUser) return;
    const stopSync = startPeriodicSync(currentUser.email);
    return stopSync;
  }, [currentUser?.email]);

  const handleTripCompleted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setSessionUser(user);
    setActiveTab('dashboard'); // reset to dashboard
    handleTripCompleted(); // force refresh for user stats
  };

  const handleLogout = async () => {
    await setCurrentUser(null);
    setSessionUser(null);
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Connecting to Wheelrovo...</Text>
      </View>
    );
  }

  // If not logged in, render the Auth Screen
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen refreshTrigger={refreshTrigger} />;
      case 'tracking':
        return <TrackingScreen onTripCompleted={handleTripCompleted} userId={currentUser.email} />;
      case 'history':
        return (
          <HistoryScreen
            refreshTrigger={refreshTrigger}
            onHistoryCleared={handleTripCompleted}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onLogout={handleLogout}
            onDataReset={handleTripCompleted}
            onProfileUpdated={(updated) => setSessionUser(updated)}
          />
        );
      default:
        return <DashboardScreen />;
    }
  };

  const userRoleColor = Theme.colors.roles[currentUser.driverType as keyof typeof Theme.colors.roles] || Theme.colors.primary;

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />

      {/* Top Application Bar */}
      <SafeAreaView style={styles.topBarContainer}>
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <Compass color={Theme.colors.primary} size={24} />
            <Text style={styles.logoText}>
              WHEEL<Text style={styles.logoAccent}>ROVO</Text>
            </Text>
          </View>

          {/* Quick identity glance — tap to jump to the Profile tab for
              account settings, name/password changes, and logout. */}
          <TouchableOpacity style={styles.userSummary} onPress={() => setActiveTab('profile')}>
            <View style={[styles.roleIndicatorDot, { backgroundColor: userRoleColor }]} />
            <Text style={styles.userNameText} numberOfLines={1}>
              {currentUser.name}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Screen Content */}
      <View style={styles.contentContainer}>{renderActiveScreen()}</View>

      {/* Bottom Custom Tab Bar */}
      <SafeAreaView style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {/* Dashboard Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.8}
          >
            <LayoutGrid
              color={activeTab === 'dashboard' ? Theme.colors.primary : Theme.colors.textMuted}
              size={22}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'dashboard' ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              Dashboard
            </Text>
            {activeTab === 'dashboard' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          {/* Active Tracker Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('tracking')}
            activeOpacity={0.8}
          >
            <Navigation
              color={activeTab === 'tracking' ? Theme.colors.primary : Theme.colors.textMuted}
              size={22}
              style={{ transform: [{ rotate: '45deg' }] }}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'tracking' ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              Track Drive
            </Text>
            {activeTab === 'tracking' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          {/* Driving Logs Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <History
              color={activeTab === 'history' ? Theme.colors.primary : Theme.colors.textMuted}
              size={22}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'history' ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              History Logs
            </Text>
            {activeTab === 'history' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          {/* Profile Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.8}
          >
            <User
              color={activeTab === 'profile' ? Theme.colors.primary : Theme.colors.textMuted}
              size={22}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'profile' ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              Profile
            </Text>
            {activeTab === 'profile' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    marginTop: Theme.spacing.md,
  },
  topBarContainer: {
    backgroundColor: Theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Theme.fonts.bold,
    letterSpacing: 1.5,
    marginLeft: Theme.spacing.sm,
  },
  logoAccent: {
    color: Theme.colors.primary,
  },
  userSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardHighlight,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    maxWidth: 180,
  },
  roleIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userNameText: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    maxWidth: 90,
  },
  contentContainer: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: Theme.colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  tabBar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: Theme.fonts.regular,
  },
  tabLabelActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  tabLabelInactive: {
    color: Theme.colors.textMuted,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    backgroundColor: Theme.colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});
