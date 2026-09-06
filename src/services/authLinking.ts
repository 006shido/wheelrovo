import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase's email-link auth flow redirects back into the app with tokens in
// the URL — this module parses that link and tracks the signup details that
// need to survive the round trip through the user's email app.

const PENDING_REGISTRATION_KEY = '@wheelrovo:pending_registration';

/**
 * The URL Supabase should redirect to after a signup confirmation or
 * password-reset email link is tapped. Uses Linking.createURL so it resolves
 * correctly in Expo Go (an exp:// proxy URL) as well as in a standalone/dev
 * client build (the wheelrovo:// scheme from app.json).
 *
 * This exact URL (or a matching wildcard) must also be added to your
 * Supabase project's Authentication → URL Configuration → Redirect URLs
 * allow-list, or Supabase will silently ignore it and fall back to the
 * default Site URL instead.
 */
export function getAuthRedirectUrl(): string {
  return Linking.createURL('auth-callback');
}

export interface ParsedAuthLink {
  accessToken?: string;
  refreshToken?: string;
  type?: string; // 'signup' | 'recovery' | 'magiclink' | ...
  errorDescription?: string;
}

/**
 * Supabase's implicit-flow email links carry the session tokens in the URL
 * fragment (after '#'), not the query string — e.g.
 * wheelrovo://auth-callback#access_token=...&refresh_token=...&type=signup
 * Some error responses use '?' instead, so both are checked.
 */
export function parseAuthLink(url: string): ParsedAuthLink {
  const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params = new URLSearchParams(fragment);
  return {
    accessToken: params.get('access_token') ?? undefined,
    refreshToken: params.get('refresh_token') ?? undefined,
    type: params.get('type') ?? undefined,
    errorDescription: params.get('error_description') ?? undefined,
  };
}

export interface PendingRegistration {
  name: string;
  username: string;
  driverType: string;
  email: string;
}

/**
 * The registration form's details (name/username/driver type), saved right
 * before the confirmation email is sent so they're still available when the
 * user taps the link and lands back in the app — possibly after the app was
 * fully closed while they were in their email client. Deliberately excludes
 * the password: Supabase Auth already has it from signUp(), and the local
 * account mirror doesn't actually check it once real Supabase auth is wired
 * up, so there's no reason to hold a cleartext copy in storage longer than
 * necessary.
 */
export async function savePendingRegistration(data: PendingRegistration): Promise<void> {
  await AsyncStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(data));
}

export async function loadPendingRegistration(): Promise<PendingRegistration | null> {
  const json = await AsyncStorage.getItem(PENDING_REGISTRATION_KEY);
  return json ? JSON.parse(json) : null;
}

export async function clearPendingRegistration(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_REGISTRATION_KEY);
}
