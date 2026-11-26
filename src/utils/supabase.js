import { createClient } from '@supabase/supabase-js';

const supabaseUrl = window.__ENV?.SUPABASE_PROJECT_URL || import.meta.env.SUPABASE_PROJECT_URL;
const supabaseKey = window.__ENV?.SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY;

// No-op lock — avoids Navigator Lock API hangs on reload and the
// deadlock that a promise-chaining lock causes when onAuthStateChange
// callbacks make Supabase queries.
const noopLock = (_name, _acquireTimeout, fn) => fn();

// Singleton: survive Vite HMR to avoid duplicate clients
const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null;

  const key = '__supabase_client__';
  if (!globalThis[key]) {
    globalThis[key] = createClient(supabaseUrl, supabaseKey, {
      auth: {
        storageKey: 'projekt-planer-auth',
        flowType: 'implicit',
        detectSessionInUrl: true,
        lock: noopLock,
      },
    });
  }
  return globalThis[key];
};

export const supabase = getSupabase();
export const isSupabaseConfigured = !!supabase;
