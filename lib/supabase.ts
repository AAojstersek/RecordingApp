import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSupabaseServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recording } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required Supabase environment variable: SUPABASE_SERVICE_ROLE_KEY");
}

// TypeScript assertion: we've checked these are defined above
const supabaseUrl: string = SUPABASE_URL;
const supabaseAnonKey: string = SUPABASE_ANON_KEY;
const supabaseServiceRoleKey: string = SUPABASE_SERVICE_ROLE_KEY;

/**
 * Creates a Supabase client for use in client components (browser)
 * @returns Supabase client instance
 */
export function createBrowserClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client for use in server components and route handlers
 * Uses cookie-based authentication
 * @returns Supabase client instance
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates an admin Supabase client using service role key
 * Server-only - bypasses RLS policies
 * @returns Supabase admin client instance
 */
export function createAdminClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Recording CRUD Helpers
// ============================================================================

/**
 * Gets a recording by ID
 * @param id - Recording ID
 * @param client - Supabase client (server client recommended)
 * @returns Recording or null if not found
 * @throws Error if query fails
 */
export async function getRecordingById(
  id: string,
  client?: SupabaseClient
): Promise<Recording | null> {
  const supabase = client || await createServerClient();

  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(`Failed to get recording: ${error.message}`);
  }

  return data as Recording;
}

/**
 * Lists all recordings for the authenticated user
 * Uses the authenticated user from server context
 * @param client - Optional Supabase client (server client recommended)
 * @returns Array of recordings
 * @throws Error if query fails or user is not authenticated
 */
export async function listMyRecordings(
  client?: SupabaseClient
): Promise<Recording[]> {
  const supabase = client || await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(`Failed to get authenticated user: ${authError?.message || "User not authenticated"}`);
  }

  const { data, error } = await supabase
    .from("recordings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list recordings: ${error.message}`);
  }

  return (data || []) as Recording[];
}

/**
 * Creates a new recording
 * @param data - Recording data (user_id will be set automatically if not provided)
 * @param client - Optional Supabase client (server client recommended)
 * @returns Created recording
 * @throws Error if creation fails
 */
export async function createRecording(
  data: Omit<Recording, "id" | "created_at" | "updated_at">,
  client?: SupabaseClient
): Promise<Recording> {
  const supabase = client || await createServerClient();

  // If user_id is not provided, get it from the authenticated user
  let userId = data.user_id;
  if (!userId) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error(`Failed to get authenticated user: ${authError?.message || "User not authenticated"}`);
    }
    userId = user.id;
  }

  const { data: recording, error } = await supabase
    .from("recordings")
    .insert({
      ...data,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create recording: ${error.message}`);
  }

  return recording as Recording;
}

/**
 * Updates a recording
 * @param id - Recording ID
 * @param updates - Partial recording data to update
 * @param client - Optional Supabase client (server client recommended)
 * @returns Updated recording
 * @throws Error if update fails or recording not found
 */
export async function updateRecording(
  id: string,
  updates: Partial<Omit<Recording, "id" | "user_id" | "created_at">>,
  client?: SupabaseClient
): Promise<Recording> {
  const supabase = client || await createServerClient();

  const { data, error } = await supabase
    .from("recordings")
    .update({
      ...updates,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error(`Recording not found: ${id}`);
    }
    throw new Error(`Failed to update recording: ${error.message}`);
  }

  return data as Recording;
}

/**
 * Deletes a recording
 * @param id - Recording ID
 * @param client - Optional Supabase client (server client recommended)
 * @throws Error if deletion fails
 */
export async function deleteRecording(
  id: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client || await createServerClient();

  const { error } = await supabase
    .from("recordings")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete recording: ${error.message}`);
  }
}

