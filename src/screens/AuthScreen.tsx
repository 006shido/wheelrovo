import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Compass, Mail, Shield, ArrowLeft, RefreshCw, Eye, EyeOff, Lock, User } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { isDemoMode, supabase } from '../utils/supabase';
import { registerUser, loginUser, UserProfile, setCurrentUser } from '../utils/storage';
import { getAuthRedirectUrl, savePendingRegistration } from '../services/authLinking';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'register';
type AuthStep = 'credentials' | 'otp' | 'check-email';
type DriverRole = 'Casual' | 'Delivery' | 'Trucker' | 'Racer';

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<AuthStep>('credentials');
  
  // Credentials state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [driverType, setDriverType] = useState<DriverRole>('Casual');
  
  // OTP state (only used for registration verification)
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(''); // Only used in Demo Mode
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  
  // Active styling highlights
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Send Registration OTP / Direct Login
  const handleAuthSubmit = async () => {
    const formattedEmail = email.trim().toLowerCase();
    if (!formattedEmail || !password) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'register' && !name) {
      Alert.alert('Required Field', 'Please enter your driver name.');
      return;
    }

    if (mode === 'register') {
      const usernamePattern = /^[a-z0-9_]{3,20}$/i;
      if (!usernamePattern.test(username.trim())) {
        Alert.alert(
          'Invalid Username',
          'Username must be 3-20 characters, using only letters, numbers, and underscores.'
        );
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        // --- DIRECT LOGIN FLOW (NO OTP) ---
        if (isDemoMode) {
          const profile = await loginUser(formattedEmail, password);
          if (profile) {
            onAuthSuccess(profile);
          } else {
            Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
          }
        } else {
          // Real Supabase Auth login
          if (!supabase) return;
          const { data, error } = await supabase.auth.signInWithPassword({
            email: formattedEmail,
            password,
          });
          if (error) {
            const localProfile = await loginUser(formattedEmail, password);
            if (localProfile) {
              onAuthSuccess(localProfile);
              setLoading(false);
              return;
            }
            throw error;
          }

          if (data && data.user) {
            // Load local profile attributes
            const usersJson = await AsyncStorage.getItem('@wheelrovo:registered_users');
            const users = usersJson ? JSON.parse(usersJson) : [];
            const existing = users.find((u: any) => u.email === formattedEmail);

            // Fetch profile from Supabase first
            const { data: remoteProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            const fallbackUsername = (formattedEmail.split('@')[0] || 'driver').toLowerCase().replace(/[^a-z0-9_]/g, '');
            const name = remoteProfile?.display_name || (existing ? existing.name : data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'Driver');
            const userUsername = remoteProfile?.username || (existing ? existing.username : data.user.user_metadata?.username || fallbackUsername);
            const driverType = remoteProfile?.driver_type || (existing ? existing.driverType : data.user.user_metadata?.driver_type || 'Casual');

            if (!remoteProfile) {
              await supabase.from('profiles').upsert(
                {
                  id: data.user.id,
                  email: formattedEmail,
                  username: userUsername,
                  display_name: name,
                  driver_type: driverType,
                },
                { onConflict: 'id' }
              );
            }

            const userProfile: UserProfile = {
              name,
              email: formattedEmail,
              username: userUsername,
              driverType,
            };
            await setCurrentUser(userProfile);
            onAuthSuccess(userProfile);
          }
        }
        setLoading(false);
      } else {
        // --- SIGN UP / REGISTRATION FLOW (OTP GATE) ---
        if (isDemoMode) {
          // Check if email or username already exists
          const usersJson = await AsyncStorage.getItem('@wheelrovo:registered_users');
          const users = usersJson ? JSON.parse(usersJson) : [];
          const formattedUsername = username.trim().toLowerCase();
          const emailExists = users.some((u: any) => u.email === formattedEmail);
          if (emailExists) {
            setLoading(false);
            Alert.alert('Email Registered', 'This email is already registered. Please sign in.');
            return;
          }
          const usernameExists = users.some((u: any) => u.username?.toLowerCase() === formattedUsername);
          if (usernameExists) {
            setLoading(false);
            Alert.alert('Username Taken', 'That username is already in use. Please choose another.');
            return;
          }

          // Generate mock OTP
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(code);
          setStep('otp');
          setOtpCode('');
        } else {
          // Real Supabase Auth SignUp — sends a confirmation LINK (not an
          // OTP code) to the user's email, since template customization to
          // OTP-style codes needs custom SMTP + a verified sending domain
          // that this app doesn't require. Save the profile details now so
          // they're still there when the user taps the link and lands back
          // in the app, possibly after it was fully closed in the meantime.
          if (!supabase) return;

          await savePendingRegistration({
            name,
            username: username.trim().toLowerCase(),
            driverType,
            email: formattedEmail,
          });

          const { error } = await supabase.auth.signUp({
            email: formattedEmail,
            password,
            options: { emailRedirectTo: getAuthRedirectUrl() },
          });
          if (error) throw error;

          setStep('check-email');
        }
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      Alert.alert('Authentication Error', err.message || 'An error occurred during authentication.');
      setLoading(false);
    }
  };

  // Verify Registration OTP — demo mode only. Real Supabase accounts finish
  // signup via the email confirmation link instead (see the App-level deep
  // link handler), so this never runs when isDemoMode is false.
  const handleVerifyRegisterOtp = async () => {
    if (otpCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    const formattedEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      if (otpCode === generatedOtp) {
        // Register User officially in local database with password
        const success = await registerUser(name, formattedEmail, password, driverType, username);
        if (success) {
          const userProfile: UserProfile = {
            name,
            email: formattedEmail,
            username: username.trim().toLowerCase(),
            driverType,
          };
          await setCurrentUser(userProfile);
          onAuthSuccess(userProfile);
        } else {
          Alert.alert('Registration Error', 'An account already exists for this email or username.');
        }
      } else {
        Alert.alert('Incorrect Code', 'The code you entered is incorrect. Please check and try again.');
      }
    } catch (err: any) {
      console.error('Verification Error:', err);
      Alert.alert('Verification Failed', err.message || 'Incorrect or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const driverRoles: DriverRole[] = ['Casual', 'Delivery', 'Trucker', 'Racer'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoSquare}>
              <Compass color={Theme.colors.primary} size={32} />
            </View>
            <Text style={styles.brandName}>WHEELROVO</Text>
            <Text style={styles.brandSubtitle}>DRIVER COMMUNITY PORTAL</Text>
          </View>

          {/* Step 1: Input Credentials */}
          {step === 'credentials' ? (
            <View style={styles.card}>
              {/* Tab toggling */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'login' && styles.toggleBtnActive]}
                  onPress={() => setMode('login')}
                >
                  <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                    SIGN IN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'register' && styles.toggleBtnActive]}
                  onPress={() => setMode('register')}
                >
                  <Text style={[styles.toggleText, mode === 'register' && styles.toggleTextActive]}>
                    CREATE ACCOUNT
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Name (Signup only) */}
              {mode === 'register' && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Driver Name</Text>
                  <TextInput
                    style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                    placeholder="Enter your name"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}

              {mode === 'register' && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={[styles.input, focusedField === 'username' && styles.inputFocused]}
                    placeholder="how friends will find you"
                    placeholderTextColor={Theme.colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''))}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              )}

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                  placeholder="name@email.com"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.passwordInput, focusedField === 'password' && styles.passwordInputFocused]}
                    placeholder="Min 6 characters"
                    placeholderTextColor={Theme.colors.textMuted}
                    secureTextEntry={secureText}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeBtn}>
                    {secureText ? (
                      <EyeOff color={Theme.colors.textSecondary} size={16} />
                    ) : (
                      <Eye color={Theme.colors.textSecondary} size={16} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Driver Type Selector (Register only) */}
              {mode === 'register' && (
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Driver Style</Text>
                  <View style={styles.roleGrid}>
                    {driverRoles.map((role) => {
                      const isSelected = driverType === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleButton,
                            isSelected && styles.roleButtonActive,
                          ]}
                          onPress={() => setDriverType(role)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.roleText,
                              isSelected && styles.roleTextActive,
                            ]}
                          >
                            {role}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleAuthSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {mode === 'login' ? 'SIGN IN' : 'SEND REGISTRATION OTP'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : step === 'otp' ? (
            /* Step 2 (demo mode): Verify Registration OTP */
            <View style={styles.card}>
              {isDemoMode && (
                <View style={styles.demoNoticeCard}>
                  <Shield color={Theme.colors.primary} size={16} />
                  <View style={styles.demoNoticeTextContainer}>
                    <Text style={styles.demoNoticeTitle}>[DEMO MODE] REGISTRATION OTP</Text>
                    <Text style={styles.demoNoticeCode}>{generatedOtp}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('credentials')}>
                <ArrowLeft color={Theme.colors.textSecondary} size={14} />
                <Text style={styles.backBtnText}>Back to credentials</Text>
              </TouchableOpacity>

              <View style={styles.otpHeader}>
                <Text style={styles.otpTitle}>Verify registration</Text>
                <Text style={styles.otpSubtitle}>
                  Enter the 6-digit OTP code sent to <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{email}</Text> to finish creating your account.
                </Text>
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor={Theme.colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleVerifyRegisterOtp}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.primaryBtnText}>VERIFY & CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleAuthSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <RefreshCw color={Theme.colors.textSecondary} size={12} />
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Step 2 (real Supabase mode): Check Email */
            <View style={styles.card}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('credentials')}>
                <ArrowLeft color={Theme.colors.textSecondary} size={14} />
                <Text style={styles.backBtnText}>Back to credentials</Text>
              </TouchableOpacity>

              <View style={styles.otpHeader}>
                <Mail color={Theme.colors.primary} size={28} style={{ marginBottom: Theme.spacing.md }} />
                <Text style={styles.otpTitle}>Check your email</Text>
                <Text style={styles.otpSubtitle}>
                  We sent a confirmation link to{' '}
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{email}</Text>. Tap it to finish
                  creating your account — you'll land back here automatically.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleAuthSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Theme.colors.textSecondary} />
                ) : (
                  <>
                    <RefreshCw color={Theme.colors.textSecondary} size={12} />
                    <Text style={styles.resendText}>Resend email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flexGrow: 1,
    padding: Theme.spacing.lg,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  logoSquare: {
    width: 52,
    height: 52,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
  },
  brandName: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Theme.fonts.bold,
    letterSpacing: 2,
    marginTop: Theme.spacing.md,
  },
  brandSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: Theme.spacing.xs,
  },
  card: {
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    paddingBottom: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.primary,
  },
  toggleText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  toggleTextActive: {
    color: Theme.colors.primary,
  },
  inputWrapper: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.sm,
    letterSpacing: 0.5,
  },
  input: {
    height: 44,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    color: Theme.colors.textPrimary,
    paddingHorizontal: Theme.spacing.sm,
    fontSize: 14,
    backgroundColor: '#000',
  },
  inputFocused: {
    borderColor: Theme.colors.borderActive,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    color: Theme.colors.textPrimary,
    paddingLeft: Theme.spacing.sm,
    paddingRight: 40,
    fontSize: 14,
    backgroundColor: '#000',
  },
  passwordInputFocused: {
    borderColor: Theme.colors.borderActive,
  },
  eyeBtn: {
    position: 'absolute',
    right: Theme.spacing.sm,
    padding: Theme.spacing.xs,
  },
  roleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.xs,
  },
  roleButton: {
    flex: 1,
    height: 38,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: '#000',
  },
  roleButtonActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary,
  },
  roleText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
  },
  roleTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: Theme.colors.primary,
    height: 46,
    borderRadius: Theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  primaryBtnText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  backBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 6,
  },
  otpHeader: {
    marginBottom: Theme.spacing.lg,
  },
  otpTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  otpSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  otpInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 6,
    backgroundColor: '#000',
  },
  demoNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardHighlight,
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
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  demoNoticeCode: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 2,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.md,
    paddingVertical: 8,
  },
  resendText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 6,
  },
});
