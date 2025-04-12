import { createBrowserClient } from './supabase';

/**
 * Gets the current user's auth token
 * @returns A Promise that resolves to the current auth token
 */
export async function getAuthToken(): Promise<string> {
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.getSession();
  
  if (!data.session) {
    throw new Error('No active session found');
  }
  
  return data.session.access_token;
} 