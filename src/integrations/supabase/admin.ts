// src/integrations/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Don't crash the build (e.g. Next.js page-data collection) when env vars are
  // absent. At runtime the env vars must be set for any admin Supabase call to work.
  console.warn(
    'Missing Supabase admin environment variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). ' +
      'Admin Supabase requests will fail until they are configured.'
  );
}

// Server-only client — import this ONLY from src/pages/api/** or other
// server-side code, never from a React component. It uses the service role
// key, which bypasses Row Level Security entirely.
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL ?? 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key'
);
