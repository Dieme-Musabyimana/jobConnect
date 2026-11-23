import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  supabaseUrl.startsWith('http')
);

// Graceful fallback: null if unconfigured or offline so app never crashes
export const supabase = isConfiguredSafe() ? createClient(supabaseUrl, supabaseAnonKey) : null;

function isConfiguredSafe() {
  try {
    return isSupabaseConfigured;
  } catch (e) {
    return false;
  }
}