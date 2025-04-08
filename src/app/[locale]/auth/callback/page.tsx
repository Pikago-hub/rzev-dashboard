"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const t = useTranslations("auth.callback");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session && window.location.hash.includes("access_token")) {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error: setError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (setError) {
            setStatus("error");
            toast({
              title: t("sessionError"),
              description: setError.message,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Get the current session after it's been set
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      // Check if user exists and if is_merchant flag is not set, update it
      if (user) {
        // For Google OAuth users, we need to ensure they have is_merchant flag set
        // and also ensure they have a merchant_profiles record
        const isGoogleUser = user.app_metadata?.provider === "google";
        const needsMerchantFlagUpdate = !user.user_metadata.is_merchant;

        if (needsMerchantFlagUpdate || isGoogleUser) {
          console.log("Setting user as merchant for OAuth user");
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

            // For Google users, we also need to ensure they have a profile record
            // This will be handled by our database trigger, but we'll check anyway
            if (isGoogleUser) {
              try {
                // Check if the user has a merchant_profiles record
                const { data: profileData, error: profileError } =
                  await supabase
                    .from("merchant_profiles")
                    .select("id")
                    .eq("id", user.id)
                    .single();

                if (profileError || !profileData) {
                  console.log("Creating merchant profile for Google user");
                  // Create a merchant_profiles record for this user
                  const { error: insertError } = await supabase
                    .from("merchant_profiles")
                    .insert({
                      id: user.id,
                      display_name:
                        user.user_metadata.full_name ||
                        user.user_metadata.name ||
                        user.email,
                      first_name:
                        user.user_metadata.given_name ||
                        user.user_metadata.first_name,
                      last_name:
                        user.user_metadata.family_name ||
                        user.user_metadata.last_name,
                      avatar_url:
                        user.user_metadata.picture ||
                        user.user_metadata.avatar_url,
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
      }

      setStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    };

    handleOAuthCallback();
  }, [router, supabase, t]);

  return (
    <div className="container flex items-center justify-center min-h-screen py-4 md:py-8">
      <div className="w-full max-w-md text-center my-auto bg-background p-6 rounded-lg border border-border shadow-sm">
        {status === "loading" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin mb-2 border-2 border-primary border-t-transparent rounded-full"></div>
            <p>{t("confirming")}</p>
          </div>
        ) : status === "success" ? (
          <div className="py-8">
            <p className="text-green-600 font-medium">{t("success")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("redirecting")}
            </p>
          </div>
        ) : (
          <div className="py-8">
            <p className="text-red-600 font-medium">{t("error")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
