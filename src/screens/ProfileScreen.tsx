import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { User, Key, Edit3, ArrowLeft, Shield, RotateCcw, LogOut, Check, X, Settings, Users, ChevronRight } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { isDemoMode, supabase } from '../utils/supabase';
import {
  getCurrentUser,
  updateUserName,
  updateUserPassword,
  clearAllData,
  UserProfile,
} from '../utils/storage';
import FriendsScreen from './FriendsScreen';
import { getAuthRedirectUrl } from '../services/authLinking';
import { confirmAction } from '../utils/confirm';

interface ProfileScreenProps {
  onLogout: () => void;
  onDataReset: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
}

export default function ProfileScreen({ onLogout, onDataReset, onProfileUpdated }: ProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'main' | 'settings' | 'friends'>('main');

  // Change name flow
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // Change password flow
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStep, setPasswordStep] = useState<'input' | 'otp' | 'link-sent'>('input');
  const [pwdOtpCode, setPwdOtpCode] = useState('');
  const [generatedPwdOtp, setGeneratedPwdOtp] = useState(''); // Demo mode only
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      setProfile(user);
      setLoading(false);
    })();
  }, []);

  // --- NAME UPDATE ---

  const handleStartEditName = () => {
    setNewName(profile?.name ?? '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Name cannot be empty.');
      return;
    }
    if (!profile) return;

    setNameLoading(true);
    try {
      const updated = await updateUserName(profile.email, trimmed);
      if (updated) {
        setProfile(updated);
        onProfileUpdated(updated);
        setIsEditingName(false);
      } else {
        Alert.alert('Error', 'Could not update your name. Please try again.');
      }
    } finally {
      setNameLoading(false);
    }
  };

  // --- PASSWORD UPDATE ---
  // Demo mode: same-session mock OTP flow, unchanged.
  // Real mode: sends an email confirmation LINK instead (no OTP template
  // without custom SMTP — see the note in AuthScreen). The new password
  // itself is entered AFTER the link is tapped, in App.tsx's recovery-mode
  // screen, once a real recovery session is active — not here, since this
  // input would otherwise sit stale in memory during the round trip through
  // the user's email app.

  const handleRequestPasswordChange = async () => {
    if (!profile) return;

    setPwdLoading(true);
    try {
      if (isDemoMode) {
        if (!newPassword || newPassword.length < 6) {
          Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
          setPwdLoading(false);
          return;
        }
        // Generate mock OTP code for changing password
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedPwdOtp(code);
        setPasswordStep('otp');
        setPwdOtpCode('');
      } else {
        if (!supabase) return;
        const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
          redirectTo: getAuthRedirectUrl(),
        });
        if (error) throw error;
        setPasswordStep('link-sent');
      }
    } catch (err: any) {
      console.error('Password change request error:', err);
      Alert.alert('Error', err.message || 'Could not send the reset email.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleVerifyPasswordOtp = async () => {
    if (pwdOtpCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }
    if (!profile) return;

    setPwdLoading(true);
    try {
      if (pwdOtpCode === generatedPwdOtp) {
        const success = await updateUserPassword(profile.email, newPassword);
        if (success) {
          Alert.alert('Password Updated', 'Your password has been changed successfully.');
          setIsChangingPassword(false);
          setNewPassword('');
          setPasswordStep('input');
        } else {
          Alert.alert('Error', 'Could not update your password. Please try again.');
        }
      } else {
        Alert.alert('Incorrect Code', 'The verification code you entered is incorrect.');
      }
    } catch (err: any) {
      console.error('Password OTP verification error:', err);
      Alert.alert('Verification Failed', err.message || 'OTP verification failed.');
    } finally {
      setPwdLoading(false);
    }
  };

  const resetAllData = () => {
    confirmAction(
      'Reset All Data',
      'This will erase your trips, XP, and tasks on this device. This cannot be undone.',
      'Reset',
      async () => {
        await clearAllData();
        onDataReset();
      }
    );
  };

  const confirmLogout = () => {
    confirmAction('Log Out', 'Are you sure you want to log out?', 'Log Out', onLogout);
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

  // --- Convoy sub-view: reuses the full Friends screen as-is ---
  if (view === 'friends') {
    return (
      <View style={styles.subViewContainer}>
        <SafeAreaView style={styles.subViewHeaderSafe}>
          <View style={styles.subViewHeader}>
            <TouchableOpacity style={styles.subViewBackBtn} onPress={() => setView('main')}>
              <ArrowLeft color={Theme.colors.textPrimary} size={20} />
            </TouchableOpacity>
            <Text style={styles.subViewTitle}>FRIENDS</Text>
            <View style={{ width: 32 }} />
          </View>
        </SafeAreaView>
        <FriendsScreen />
      </View>
    );
  }

  // --- Settings sub-view: Security & Password, then Reset All Data ---
  if (view === 'settings') {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.subViewHeader}>
          <TouchableOpacity style={styles.subViewBackBtn} onPress={() => setView('main')}>
            <ArrowLeft color={Theme.colors.textPrimary} size={20} />
          </TouchableOpacity>
          <Text style={styles.subViewTitle}>SETTINGS</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          {/* Change Password Panel */}
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingsHeader}
              onPress={() => {
                setIsChangingPassword(!isChangingPassword);
                setPasswordStep('input');
                setNewPassword('');
              }}
            >
              <View style={styles.settingsHeaderLeft}>
                <Key color={Theme.colors.primary} size={18} />
                <Text style={styles.settingsTitle}>SECURITY & PASSWORD</Text>
              </View>
              <Text style={styles.expandText}>{isChangingPassword ? 'COLLAPSE' : 'EXPAND'}</Text>
            </TouchableOpacity>

            {isChangingPassword && (
              <View style={styles.settingsContent}>
                {passwordStep === 'input' ? (
                  <View>
                    {isDemoMode ? (
                      <>
                        <Text style={styles.label}>ENTER NEW PASSWORD</Text>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Min 6 characters"
                          placeholderTextColor={Theme.colors.textMuted}
                          secureTextEntry
                          value={newPassword}
                          onChangeText={setNewPassword}
                        />
                        <TouchableOpacity
                          style={styles.updateBtn}
                          onPress={handleRequestPasswordChange}
                          disabled={pwdLoading}
                          activeOpacity={0.8}
                        >
                          {pwdLoading ? (
                            <ActivityIndicator size="small" color="#000000" />
                          ) : (
                            <Text style={styles.updateBtnText}>SEND UPDATE OTP CODE</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.label}>
                          We'll email you a link — tap it to choose a new password.
                        </Text>
                        <TouchableOpacity
                          style={styles.updateBtn}
                          onPress={handleRequestPasswordChange}
                          disabled={pwdLoading}
                          activeOpacity={0.8}
                        >
                          {pwdLoading ? (
                            <ActivityIndicator size="small" color="#000000" />
                          ) : (
                            <Text style={styles.updateBtnText}>SEND PASSWORD RESET LINK</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : passwordStep === 'link-sent' ? (
                  <View>
                    <View style={styles.demoNoticeCard}>
                      <Shield color={Theme.colors.primary} size={16} />
                      <View style={styles.demoNoticeTextContainer}>
                        <Text style={styles.demoNoticeTitle}>CHECK YOUR EMAIL</Text>
                        <Text style={styles.linkSentText}>
                          We sent a reset link to {profile?.email}. Tap it, then set your new password
                          right there in the app.
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => {
                        setPasswordStep('input');
                        setIsChangingPassword(false);
                      }}
                    >
                      <ArrowLeft color={Theme.colors.textSecondary} size={12} />
                      <Text style={styles.backBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {isDemoMode && (
                      <View style={styles.demoNoticeCard}>
                        <Shield color={Theme.colors.primary} size={16} />
                        <View style={styles.demoNoticeTextContainer}>
                          <Text style={styles.demoNoticeTitle}>[DEMO MODE] PASSWORD UPDATE OTP</Text>
                          <Text style={styles.demoNoticeCode}>{generatedPwdOtp}</Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity style={styles.backBtn} onPress={() => setPasswordStep('input')}>
                      <ArrowLeft color={Theme.colors.textSecondary} size={12} />
                      <Text style={styles.backBtnText}>Back to password input</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>ENTER 6-DIGIT VERIFICATION CODE</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="000000"
                      placeholderTextColor={Theme.colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={pwdOtpCode}
                      onChangeText={setPwdOtpCode}
                    />
                    <TouchableOpacity
                      style={styles.updateBtn}
                      onPress={handleVerifyPasswordOtp}
                      disabled={pwdLoading}
                      activeOpacity={0.8}
                    >
                      {pwdLoading ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <Text style={styles.updateBtnText}>VERIFY & UPDATE PASSWORD</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Reset All Data — below Security & Password, as its own card */}
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.accountActionRow} onPress={resetAllData}>
              <View style={styles.settingsHeaderLeft}>
                <RotateCcw color={Theme.colors.textSecondary} size={18} />
                <Text style={styles.settingsTitle}>RESET ALL DATA</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Main view ---
  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <User color={Theme.colors.primary} size={26} />
            </View>
            <View style={styles.profileText}>
              {isEditingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Your name"
                    placeholderTextColor={Theme.colors.textMuted}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.nameEditBtn}
                    onPress={handleSaveName}
                    disabled={nameLoading}
                  >
                    {nameLoading ? (
                      <ActivityIndicator size="small" color={Theme.colors.primary} />
                    ) : (
                      <Check color={Theme.colors.primary} size={18} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nameEditBtn}
                    onPress={() => setIsEditingName(false)}
                    disabled={nameLoading}
                  >
                    <X color={Theme.colors.textMuted} size={18} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameRow}>
                  <Text style={styles.driverName}>{profile ? profile.name : 'Driver'}</Text>
                  <TouchableOpacity onPress={handleStartEditName} style={styles.editNameBtn}>
                    <Edit3 color={Theme.colors.textMuted} size={14} />
                  </TouchableOpacity>
                  {profile && (
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{profile.driverType.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.driverEmail}>{profile ? profile.email : ''}</Text>
              {profile?.username && <Text style={styles.driverUsername}>@{profile.username}</Text>}
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => setView('friends')}>
            <View style={styles.settingsHeaderLeft}>
              <Users color={Theme.colors.primary} size={18} />
              <Text style={styles.settingsTitle}>FRIENDS</Text>
            </View>
            <ChevronRight color={Theme.colors.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.accountActionDivider} />

          <TouchableOpacity style={styles.menuRow} onPress={() => setView('settings')}>
            <View style={styles.settingsHeaderLeft}>
              <Settings color={Theme.colors.primary} size={18} />
              <Text style={styles.settingsTitle}>SETTINGS</Text>
            </View>
            <ChevronRight color={Theme.colors.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.accountActionRow} onPress={confirmLogout}>
            <View style={styles.settingsHeaderLeft}>
              <LogOut color={Theme.colors.danger} size={18} />
              <Text style={[styles.settingsTitle, { color: Theme.colors.danger }]}>LOG OUT</Text>
            </View>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: Theme.spacing.md,
  },
  profileCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  profileText: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  driverName: {
    color: Theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  editNameBtn: {
    marginLeft: 8,
    padding: 2,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    height: 36,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    color: Theme.colors.textPrimary,
    paddingHorizontal: Theme.spacing.sm,
    fontSize: 14,
    backgroundColor: '#000',
  },
  nameEditBtn: {
    marginLeft: 8,
    padding: 4,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginLeft: Theme.spacing.sm,
    backgroundColor: '#000',
  },
  roleBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  driverEmail: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  driverUsername: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  expandText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  settingsContent: {
    marginTop: Theme.spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: Theme.colors.border,
    paddingTop: Theme.spacing.md,
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  passwordInput: {
    height: 40,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    color: Theme.colors.textPrimary,
    paddingHorizontal: Theme.spacing.sm,
    fontSize: 13,
    backgroundColor: '#000',
    marginBottom: Theme.spacing.md,
  },
  updateBtn: {
    backgroundColor: Theme.colors.primary,
    height: 40,
    borderRadius: Theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  backBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginLeft: 6,
  },
  otpInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 4,
    backgroundColor: '#000',
    marginBottom: Theme.spacing.md,
  },
  demoNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  demoNoticeTextContainer: {
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  demoNoticeTitle: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  demoNoticeCode: {
    color: Theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 1.5,
  },
  linkSentText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  accountActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  accountActionDivider: {
    height: 1.5,
    backgroundColor: Theme.colors.border,
    marginVertical: Theme.spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  subViewContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  subViewHeaderSafe: {
    backgroundColor: Theme.colors.background,
  },
  subViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: Theme.colors.border,
  },
  subViewBackBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  subViewTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
