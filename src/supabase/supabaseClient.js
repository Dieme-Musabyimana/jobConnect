import { createClient } from '@supabase/supabase-js'

// Vite uses import.meta.env to access your .env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This creates the connection to your specific database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)