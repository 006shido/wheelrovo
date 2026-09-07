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
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { Theme } from './src/styles/theme';
import DashboardScreen from './src/screens/DashboardScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AuthScreen from './src/screens/AuthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import SetNewPasswordScreen from './src/screens/SetNewPasswordScreen';
import { LayoutGrid, Navigation, History, Compass, User, Users } from 'lucide-react-native';
import { getCurrentUser, setCurrentUser, registerUser, UserProfile } from './src/utils/storage';
import { reconcileTripsOnLaunch } from './src/services/locationTask';
import { startPeriodicSync } from './src/services/sync';
import { supabase, isDemoMode } from './src/utils/supabase';
import { parseAuthLink, loadPendingRegistration, clearPendingRegistration } from './src/services/authLinking';
import { ensureRemoteProfile, syncLocalTripsToRemote } from './src/utils/friends';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracking' | 'history' | 'community' | 'profile'>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUser, setSessionUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // Set when a password-recovery email link has just been confirmed — the
  // app shows SetNewPasswordScreen instead of its normal content until the
  // person picks a new password, since a live recovery session is only good
  // for that one action.
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);

  // Check auth session on startup
  useEffect(() => {
    (async () => {
      // Close out any trip left "active" by a killed background process
      // before the tracking UI can render and get confused by it.
      await reconcileTripsOnLaunch();
      const user = await getCurrentUser();
      setSessionUser(user);
      setAuthLoading(false);

      if (user && !isDemoMode && supabase) {
        await ensureRemoteProfile(user.email);
        await syncLocalTripsToRemote(user.email);
      }
    })();
  }, []);

  // Handles the email-link auth flow (see AuthScreen and ProfileScreen):
  // Supabase redirects back into the app with tokens in the URL after a
  // signup confirmation or password-reset link is tapped. This listens for
  // that both on cold start (app was fully closed while the person was in
  // their email client) and while already running.
  useEffect(() => {
    if (isDemoMode || !supabase) return;

    const processUrl = async (url: string | null) => {
      if (!url) return;
      const { accessToken, refreshToken, type } = parseAuthLink(url);
      if (!accessToken || !refreshToken || !supabase) return;

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error || !data.session) {
        console.error('[auth-link] setSession failed', error?.message);
        return;
      }

      const sessionEmail = data.session.user.email ?? '';

      if (type === 'recovery') {
        setRecoveryEmail(sessionEmail);
        return;
      }

      if (type === 'signup') {
        const pending = await loadPendingRegistration();
        const name = pending?.name ?? sessionEmail.split('@')[0] ?? 'Driver';
        const username = pending?.username ?? (sessionEmail.split('@')[0] ?? 'driver').toLowerCase();
        const driverType = pending?.driverType ?? 'Casual';

        // Local mirror — password is unused for real-mode login (Supabase
        // Auth already has it), so a placeholder is stored instead of ever
        // holding a cleartext copy here.
        await registerUser(name, sessionEmail, '__SUPABASE_AUTH__', driverType, username);

        await supabase.from('profiles').upsert({
          id: data.session.user.id,
          email: sessionEmail,
          username,
          display_name: name,
          driver_type: driverType,
        });

        const profile: UserProfile = { name, email: sessionEmail, username, driverType };
        await setCurrentUser(profile);
        setSessionUser(profile);
        setActiveTab('dashboard');
        await clearPendingRegistration();
      }
    };

    Linking.getInitialURL().then(processUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => processUrl(url));
    return () => subscription.remove();
  }, []);

  // Periodic sync of buffered trip points runs for as long as someone is
  // logged in, independent of which tab is open, and stops cleanly on logout.
  useEffect(() => {
    if (!currentUser) return;
    syncLocalTripsToRemote(currentUser.email).catch(() => {});
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

  // A password-recovery link just confirmed — collect the new password
  // before anything else, regardless of whether a normal session exists.
  if (recoveryEmail) {
    return (
      <SetNewPasswordScreen
        email={recoveryEmail}
        onComplete={(profile) => {
          setSessionUser(profile);
          setRecoveryEmail(null);
          setActiveTab('dashboard');
        }}
      />
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
      case 'community':
        return <CommunityScreen />;
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

          {/* Community Tab */}
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('community')}
            activeOpacity={0.8}
          >
            <Users
              color={activeTab === 'community' ? Theme.colors.primary : Theme.colors.textMuted}
              size={22}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'community' ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              Community
            </Text>
            {activeTab === 'community' && <View style={styles.activeIndicator} />}
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
