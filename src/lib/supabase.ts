import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use a valid placeholder URL if not properly configured so the app doesn't crash on load
const supabaseUrl = (envUrl && envUrl.startsWith('http')) ? envUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = envKey || 'placeholder-key';

export const isConfigured = !!(envUrl && envUrl.startsWith('http'));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
