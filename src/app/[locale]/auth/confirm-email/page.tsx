"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/sections/navbar";

export default function AuthCallbackPage() {
  const t = useTranslations("auth.confirmEmail");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const supabase = createBrowserClient();
  const router = useRouter();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log("Starting email confirmation process");

      try {
        const { data, error } = await supabase.auth.getSession();
        console.log(
          "Session check:",
          data?.session ? "Has session" : "No session",
          error
        );

        // Already has session? Skip token parsing
        if (data.session) {
          console.log("User already has a session, checking user metadata");

          const user = data.session.user;

          // Check if user exists and if is_merchant flag is not set, update it
          if (user) {
            const needsMerchantFlagUpdate = !user.user_metadata.is_merchant;

            if (needsMerchantFlagUpdate) {
              console.log("Merchant flag not set, updating user as merchant");
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
              }
            }

            // Ensure the user has a merchant_profiles record
            try {
              // Check if the user has a merchant_profiles record
              const { data: profileData, error: profileError } = await supabase
                .from("merchant_profiles")
                .select("id")
                .eq("id", user.id)
                .single();

              if (profileError || !profileData) {
                console.log("Creating merchant profile for user");
                // Extract name parts from display_name or email
                const displayName =
                  user.user_metadata.display_name || user.email;
                let firstName = user.user_metadata.first_name;
                let lastName = user.user_metadata.last_name;

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
                    phone_number: user.user_metadata.phone,
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

          setStatus("success");
          // Redirect to dashboard after a short delay to show success message
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
          return;
        }

        const hash = window.location.hash;
        const query = new URLSearchParams(hash.slice(1));
        const access_token = query.get("access_token");
        const refresh_token = query.get("refresh_token");

        console.log("URL tokens:", {
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          hash: hash ? "Present" : "Empty",
        });

        // Check for tokens in URL query params if not in hash
        if (!access_token || !refresh_token) {
          const urlParams = new URLSearchParams(window.location.search);
          const access_token_param = urlParams.get("access_token");
          const refresh_token_param = urlParams.get("refresh_token");

          console.log("Checking URL params instead:", {
            hasAccessToken: !!access_token_param,
            hasRefreshToken: !!refresh_token_param,
          });

          if (access_token_param && refresh_token_param) {
            // Use tokens from URL params
            const { error: setError } = await supabase.auth.setSession({
              access_token: access_token_param,
              refresh_token: refresh_token_param,
            });

            if (setError) {
              console.error(
                "Session set error from URL params:",
                setError.message
              );
              setStatus("error");
              toast({
                title: t("sessionError"),
                description: setError.message,
                variant: "destructive",
              });
              return;
            }

            console.log(
              "Session set successfully from URL params, checking user metadata"
            );

            // Get the current session after it's been set
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData.session?.user;

            // Check if user exists and if is_merchant flag is not set, update it
            if (user) {
              const needsMerchantFlagUpdate = !user.user_metadata.is_merchant;

              if (needsMerchantFlagUpdate) {
                console.log("Merchant flag not set, updating user as merchant");
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
                }
              }

              // Ensure the user has a merchant_profiles record
              try {
                // Check if the user has a merchant_profiles record
                const { data: profileData, error: profileError } =
                  await supabase
                    .from("merchant_profiles")
                    .select("id")
                    .eq("id", user.id)
                    .single();

                if (profileError || !profileData) {
                  console.log("Creating merchant profile for user");
                  // Extract name parts from display_name or email
                  const displayName =
                    user.user_metadata.display_name || user.email;
                  let firstName = user.user_metadata.first_name;
                  let lastName = user.user_metadata.last_name;

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
                      phone_number: user.user_metadata.phone,
                      onboarding_complete: false, // Set onboarding status to false for new users
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

            // Check if the user has completed onboarding
            try {
              // Make sure user is defined before proceeding
              if (user) {
                const { data: profileData } = await supabase
                  .from("merchant_profiles")
                  .select("onboarding_complete")
                  .eq("id", user.id)
                  .single();

                setStatus("success");

                // Redirect based on onboarding status
                setTimeout(() => {
                  if (profileData && profileData.onboarding_complete) {
                    router.push("/dashboard");
                  } else {
                    router.push("/onboarding/business-info");
                  }
                }, 1500);
                return;
              }
            } catch (err) {
              console.error("Error checking onboarding status:", err);
              // Default to onboarding if we can't determine status
              setStatus("success");
              setTimeout(() => {
                router.push("/onboarding/business-info");
              }, 1500);
              return;
            }
          }

          // If no tokens found in hash or URL params
          console.error("No tokens found in URL");
          setStatus("error");
          toast({
            title: t("error"),
            description: t("missingToken"),
            variant: "destructive",
          });
          return;
        }

        console.log("Setting session with tokens from hash");
        const { error: setError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (setError) {
          console.error("Session set error:", setError.message);
          setStatus("error");
          toast({
            title: t("sessionError"),
            description: setError.message,
            variant: "destructive",
          });
          return;
        }

        console.log("Session set successfully, checking user metadata");

        // Get the current session after it's been set
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        // Check if user exists and if is_merchant flag is not set, update it
        if (user) {
          const needsMerchantFlagUpdate = !user.user_metadata.is_merchant;

          if (needsMerchantFlagUpdate) {
            console.log("Merchant flag not set, updating user as merchant");
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
            }
          }

          // Ensure the user has a merchant_profiles record
          try {
            // Check if the user has a merchant_profiles record
            const { data: profileData, error: profileError } = await supabase
              .from("merchant_profiles")
              .select("id")
              .eq("id", user.id)
              .single();

            if (profileError || !profileData) {
              console.log("Creating merchant profile for user");
              // Extract name parts from display_name or email
              const displayName = user.user_metadata.display_name || user.email;
              let firstName = user.user_metadata.first_name;
              let lastName = user.user_metadata.last_name;

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
                  phone_number: user.user_metadata.phone,
                  avatar_url:
                    user.user_metadata.picture || user.user_metadata.avatar_url,
                  onboarding_complete: false, // Set onboarding status to false for new users
                });

              if (insertError) {
                console.error("Error creating merchant profile:", insertError);
              }
            }
          } catch (err) {
            console.error("Error checking/creating merchant profile:", err);
          }
        }

        // Check if the user has completed onboarding
        try {
          if (user) {
            const { data: profileData } = await supabase
              .from("merchant_profiles")
              .select("onboarding_complete")
              .eq("id", user.id)
              .single();

            setStatus("success");

            // Redirect based on onboarding status
            setTimeout(() => {
              if (profileData && profileData.onboarding_complete) {
                router.push("/dashboard");
              } else {
                router.push("/onboarding");
              }
            }, 1500);
            return;
          }
        } catch (err) {
          console.error("Error checking onboarding status:", err);
          // Default to onboarding if we can't determine status
          setStatus("success");
          setTimeout(() => {
            router.push("/onboarding");
          }, 1500);
          return;
        }
      } catch (err) {
        console.error("Unexpected error during confirmation:", err);
        setStatus("error");
        toast({
          title: t("error"),
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    };

    handleOAuthCallback();
  }, [router, supabase, t]);

  console.log("Current status:", status);

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md text-center my-auto">
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "loading" && (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p>{t("confirming")}</p>
              </div>
            )}
            {status === "success" && (
              <div>
                <p className="text-green-600">{t("success")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("redirecting")}
                </p>
              </div>
            )}
            {status === "error" && <p className="text-red-600">{t("error")}</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
