"use client";

import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Creates a Supabase client for use in client components (browser)
 * Uses @supabase/ssr for proper cookie handling
 * @returns Supabase client instance
 */
export function createBrowserClient(): SupabaseClient {
  return createSSRBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

