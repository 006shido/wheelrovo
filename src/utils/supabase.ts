import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Read Expo Public Environment Variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// If credentials are missing, we run in offline demo mode
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

if (isDemoMode) {
  console.log('[WHEELROVO] Running in local Auth Demo Mode. Connect Supabase keys in a .env file to enable real emails.');
}

export const supabase = isDemoMode 
  ? null 
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
