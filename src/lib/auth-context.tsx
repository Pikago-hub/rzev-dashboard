"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { createBrowserClient } from "./supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    options?: { data?: Record<string, unknown> }
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    const getSession = async () => {
      setIsLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // After successful sign-in, check if the user has the is_merchant flag
      // This handles the case where a user previously registered as a customer
      // but is now signing in as a merchant
      const user = data.user;
      if (user) {
        const needsMerchantFlagUpdate = !user.user_metadata?.is_merchant;

        if (needsMerchantFlagUpdate) {
          console.log("Updating user as merchant during sign-in");
          // Update user metadata to include is_merchant flag
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              is_merchant: true,
              // Preserve existing metadata
              ...user.user_metadata,
            },
          });

          if (updateError) {
            console.error("Error updating user metadata:", updateError);
          } else {
            console.log("User metadata updated successfully");

            // Check if the user has a merchant_profiles record
            try {
              const { data: profileData, error: profileError } = await supabase
                .from("merchant_profiles")
                .select("id")
                .eq("id", user.id)
                .single();

              if (profileError || !profileData) {
                console.log("Creating merchant profile for existing user");
                // Extract name parts from display_name or email
                const displayName =
                  user.user_metadata?.display_name || user.email;
                let firstName = user.user_metadata?.first_name;
                let lastName = user.user_metadata?.last_name;

                // If we have a display_name but no first/last name, try to split it
                if (
                  displayName &&
                  (!firstName || !lastName) &&
                  displayName.includes(" ")
                ) {
                  const nameParts = displayName.split(" ");
                  firstName = firstName || nameParts[0];
                  lastName = lastName || nameParts.slice(1).join(" ");
                }

                // Create a merchant_profiles record for this user
                const { error: insertError } = await supabase
                  .from("merchant_profiles")
                  .insert({
                    id: user.id,
                    display_name: displayName,
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: user.user_metadata?.phone,
                    avatar_url:
                      user.user_metadata?.picture ||
                      user.user_metadata?.avatar_url,
                  });

                if (insertError) {
                  console.error(
                    "Error creating merchant profile:",
                    insertError
                  );
                }
              }
            } catch (err) {
              console.error("Error checking/creating merchant profile:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          queryParams: {
            is_merchant: "true",
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  // Sign in with Magic Link (OTP)
  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          data: {
            is_merchant: true,
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error sending magic link:", error);
      throw error;
    }
  };

  // Sign up with email and password
  const signUp = async (
    email: string,
    password: string,
    options?: { data?: Record<string, unknown> }
  ) => {
    try {
      // Always include is_merchant flag when signing up from the main app
      const userData = {
        is_merchant: true,
        ...options?.data,
      };

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm-email`,
          data: userData,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // First check if we have a session
      const { data: sessionData } = await supabase.auth.getSession();

      // If no session, manually clear storage and update state
      if (!sessionData.session) {
        console.log("No active session found, manually clearing auth state");
        // Clear local state
        setUser(null);
        setSession(null);

        // Manually clear localStorage items related to auth
        if (typeof window !== "undefined") {
          localStorage.removeItem("supabase-auth");
          // You might need to remove other auth-related items if they exist
        }
        return;
      }

      // If we have a session, proceed with normal sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error);

      // Even if there's an error, try to clean up the state
      setUser(null);
      setSession(null);

      // Don't throw the error - this allows the UI to update even if the API call fails
      // Instead, we'll just log it and continue
      console.log("Continuing despite sign out error");
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
