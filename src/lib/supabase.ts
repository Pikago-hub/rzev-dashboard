import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Create a Supabase client for server-side usage
export const createServerClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

// Store a single instance of the browser client
let browserClientInstance: ReturnType<typeof createClient> | null = null;

// Create a Supabase client for client-side usage
export const createBrowserClient = () => {
  if (browserClientInstance) return browserClientInstance;

  browserClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "supabase-auth",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClientInstance;
};
