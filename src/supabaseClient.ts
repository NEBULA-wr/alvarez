import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://xfqlujutfaphyaxoaicc.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcWx1anV0ZmFwaHlheG9haWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjUyODgsImV4cCI6MjA4ODA0MTI4OH0.-jr12W3S7iqO-UueGSgvlKCC4Z2TYC2-1bHqCL2mLlo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
