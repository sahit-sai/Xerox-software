import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

const validUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const validAnon = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';
const validService = isSupabaseConfigured ? supabaseServiceKey : validAnon;

// Public client for client-side queries
export const supabase = createClient(validUrl, validAnon);

// Admin client with service role key for API routes & webhooks
export const supabaseAdmin = createClient(validUrl, validService, {
  auth: { persistSession: false },
});

