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
import { Flame, Trophy, CheckCircle, RotateCcw, User, Star, LogOut, Lock, Key, ArrowLeft, RefreshCw, Shield } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { isDemoMode, supabase } from '../utils/supabase';
import {
  loadDriverState,
  saveDriverState,
  loadCompletedTasks,
  saveCompletedTasks,
  clearAllData,
  getCurrentUser,
  updateUserPassword,
  DriverState,
  UserProfile,
} from '../utils/storage';
import { DEFAULT_TASKS, MILESTONES, Task } from '../utils/mockData';

interface DashboardScreenProps {
  onDataReset?: () => void;
  refreshTrigger?: number;
  onLogout?: () => void;
}

export default function DashboardScreen({ onDataReset, refreshTrigger, onLogout }: DashboardScreenProps) {
  const [driverState, setDriverState] = useState<DriverState>({
    xp: 0,
    level: 1,
    streak: 0,
    lastLoginDate: null,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [loading, setLoading] = useState(true);

  // Change Password flow states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStep, setPasswordStep] = useState<'input' | 'otp'>('input');
  const [pwdOtpCode, setPwdOtpCode] = useState('');
  const [generatedPwdOtp, setGeneratedPwdOtp] = useState(''); // Demo mode only
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setLoading(true);
    const user = await getCurrentUser();
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

    setProfile(user);
    setDriverState(state);
    setTasks(updatedTasks);
    setLoading(false);
  };

  // Note: Daily check-in is now handled automatically when the driver completes a drive.

  const resetAllData = () => {
    Alert.alert('Reset Progress', 'Are you sure you want to clear your statistics and logs for this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset Progress',
        style: 'destructive',
        onPress: async () => {
          await clearAllData();
          fetchData();
          if (onDataReset) onDataReset();
        },
      },
    ]);
  };

  // --- PASSWORD UPDATE OTP FLOWS ---

  const handleRequestPasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }

    if (!profile) return;

    setPwdLoading(true);

    try {
      if (isDemoMode) {
        // Generate mock OTP code for changing password
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedPwdOtp(code);
        setPasswordStep('otp');
        setPwdOtpCode('');
      } else {
        // Real Supabase: Send password reset email
        if (!supabase) return;
        const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
        if (error) throw error;

        Alert.alert('OTP Code Sent', 'A password update code has been sent to your email.');
        setPasswordStep('otp');
        setPwdOtpCode('');
      }
    } catch (err: any) {
      console.error('Password change request error:', err);
      Alert.alert('Error', err.message || 'Could not send verification code.');
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
      if (isDemoMode) {
        if (pwdOtpCode === generatedPwdOtp) {
          // Update password in local storage
          const success = await updateUserPassword(profile.email, newPassword);
          if (success) {
            Alert.alert('Password Updated', 'Your password has been changed successfully.');
            // Reset states
            setIsChangingPassword(false);
            setNewPassword('');
            setPasswordStep('input');
          } else {
            Alert.alert('Error', 'Could not update your password. Please try again.');
          }
        } else {
          Alert.alert('Incorrect Code', 'The verification code you entered is incorrect.');
        }
      } else {
        // Real Supabase Password update
        if (!supabase) return;

        // Verify OTP first (using the email reset method)
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: profile.email,
          token: pwdOtpCode,
          type: 'recovery',
        });
        if (verifyError) throw verifyError;

        // Now update password on the active user session
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (updateError) throw updateError;

        // Update local registry password mapping
        await updateUserPassword(profile.email, newPassword);

        Alert.alert('Password Updated', 'Your password has been updated in Supabase.');
        setIsChangingPassword(false);
        setNewPassword('');
        setPasswordStep('input');
      }
    } catch (err: any) {
      console.error('Password OTP verification error:', err);
      Alert.alert('Verification Failed', err.message || 'OTP verification failed.');
    } finally {
      setPwdLoading(false);
    }
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

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <User color={Theme.colors.primary} size={24} />
            </View>
            <View style={styles.profileText}>
              <View style={styles.nameRow}>
                <Text style={styles.driverName}>
                  {profile ? profile.name : 'Driver'}
                </Text>
                {profile && (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {profile.driverType.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.driverEmail}>{profile ? profile.email : ''}</Text>
            </View>
            
            {/* Action buttons */}
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={resetAllData}>
                <RotateCcw color={Theme.colors.primary} size={16} />
              </TouchableOpacity>
              {onLogout && (
                <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={onLogout}>
                  <LogOut color={Theme.colors.primary} size={16} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Level Progress */}
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
    marginBottom: Theme.spacing.md,
  },
  avatarContainer: {
    width: 42,
    height: 42,
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
  },
  driverName: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
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
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
});
