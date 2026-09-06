import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Lock, Compass } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { supabase } from '../utils/supabase';
import { updateUserPassword, findUserAccountByEmail, setCurrentUser, UserProfile } from '../utils/storage';

interface SetNewPasswordScreenProps {
  email: string;
  onComplete: (profile: UserProfile) => void;
}

export default function SetNewPasswordScreen({ email, onComplete }: SetNewPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords Don't Match", 'Please make sure both fields match.');
      return;
    }

    setLoading(true);
    try {
      if (!supabase) return;
      // The recovery session from the email link is already active at this
      // point (App.tsx called setSession before rendering this screen), so
      // this just applies the new password to it.
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await updateUserPassword(email, password);

      const profile = await findUserAccountByEmail(email);
      if (profile) {
        await setCurrentUser(profile);
        onComplete(profile);
      } else {
        Alert.alert(
          'Password Updated',
          'Your password was changed, but we could not restore your local profile. Please sign in again.'
        );
      }
    } catch (err: any) {
      console.error('Set new password error:', err);
      Alert.alert('Error', err.message || 'Could not update your password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.logoSquare}>
            <Compass color={Theme.colors.primary} size={32} />
          </View>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>
            You're confirming a password reset for{' '}
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{email}</Text>.
          </Text>

          <View style={styles.inputWrapper}>
            <Lock color={Theme.colors.textMuted} size={16} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={Theme.colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock color={Theme.colors.textMuted} size={16} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={Theme.colors.textMuted}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.primaryBtnText}>UPDATE PASSWORD</Text>
            )}
          </TouchableOpacity>
        </View>
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
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  logoSquare: {
    width: 56,
    height: 56,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: Theme.spacing.lg,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    paddingHorizontal: Theme.spacing.sm,
    height: 46,
    marginBottom: Theme.spacing.md,
  },
  inputIcon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 14,
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
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
