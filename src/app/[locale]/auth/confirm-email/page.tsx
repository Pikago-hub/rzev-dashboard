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

          // Check if user exists and if is_professional flag is not set, update it
          if (user) {
            const needsProfessionalFlagUpdate =
              !user.user_metadata.is_professional;

            if (needsProfessionalFlagUpdate) {
              console.log(
                "Professional flag not set, updating user as professional"
              );
              // Update user metadata to include is_professional flag
              const { error: updateError } = await supabase.auth.updateUser({
                data: {
                  is_professional: true,
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

            // Ensure the user has a team_member record
            try {
              // Call our API endpoint to populate the team member
              if (user?.id) {
                const response = await fetch("/api/team-member/populate", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ userId: user.id }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  console.error("Error populating team member:", errorData);
                } else {
                  console.log("Team member populated successfully");
                }
              }
            } catch (err) {
              console.error("Error populating team member:", err);
            }
          }

          // Check if the user is associated with any workspace
          try {
            // First check if there are any pending invitations
            try {
              // Use our API to check workspace status (which now checks for invitations)
              if (user?.id) {
                const response = await fetch("/api/auth/check-workspace-status", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ userId: user.id }),
                });

                const data = await response.json();
                
                if (response.ok) {
                  console.log("Redirecting to:", data.redirectUrl, "Reason:", data.message);
                  setStatus("success");
                  
                  // Redirect to the URL provided by the API
                  setTimeout(() => {
                    router.push(data.redirectUrl);
                  }, 1500);
                  return;
                }
              }
            } catch (apiErr) {
              console.error("Error checking workspace status:", apiErr);
              // Continue with fallback logic if API call fails
            }

            // Fallback to direct database check if API call fails
            if (user?.id) {
              const { data: workspaceData } = await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("team_member_id", user.id)
                .single();

              setStatus("success");

              // Redirect based on workspace association
              setTimeout(() => {
                if (workspaceData && workspaceData.workspace_id) {
                  // User is already associated with a workspace, go to dashboard
                  router.push("/dashboard");
                } else {
                  // User needs to create or join a workspace
                  router.push("/onboarding/workspace-choice");
                }
              }, 1500);
              return;
            } else {
              // No user id, redirect to onboarding
              setStatus("success");
              setTimeout(() => {
                router.push("/onboarding/workspace-choice");
              }, 1500);
              return;
            }
          } catch (err) {
            console.error("Error checking workspace association:", err);
            // Default to onboarding if we can't determine status
            setStatus("success");
            setTimeout(() => {
              router.push("/onboarding/workspace-choice");
            }, 1500);
            return;
          }
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

            // Check if user exists and if is_professional flag is not set, update it
            if (user) {
              const needsProfessionalFlagUpdate =
                !user.user_metadata.is_professional;

              if (needsProfessionalFlagUpdate) {
                console.log(
                  "Professional flag not set, updating user as professional"
                );
                // Update user metadata to include is_professional flag
                const { error: updateError } = await supabase.auth.updateUser({
                  data: {
                    is_professional: true,
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

              // Ensure the user has a team_member record
              try {
                // Call our API endpoint to populate the team member
                if (user?.id) {
                  const response = await fetch("/api/team-member/populate", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userId: user.id }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Error populating team member:", errorData);
                  } else {
                    console.log("Team member populated successfully");
                  }
                }
              } catch (err) {
                console.error("Error populating team member:", err);
              }
            }

            // Check if the user is associated with any workspace
            try {
              // First check if there are any pending invitations
              try {
                // Use our API to check workspace status (which now checks for invitations)
                if (user?.id) {
                  const response = await fetch("/api/auth/check-workspace-status", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userId: user.id }),
                  });

                  const data = await response.json();
                  
                  if (response.ok) {
                    console.log("Redirecting to:", data.redirectUrl, "Reason:", data.message);
                    setStatus("success");
                    
                    // Redirect to the URL provided by the API
                    setTimeout(() => {
                      router.push(data.redirectUrl);
                    }, 1500);
                    return;
                  }
                }
              } catch (apiErr) {
                console.error("Error checking workspace status:", apiErr);
                // Continue with fallback logic if API call fails
              }

              // Fallback to direct database check if API call fails
              if (user?.id) {
                const { data: workspaceData } = await supabase
                  .from("workspace_members")
                  .select("workspace_id")
                  .eq("team_member_id", user.id)
                  .single();

                setStatus("success");

                // Redirect based on workspace association
                setTimeout(() => {
                  if (workspaceData && workspaceData.workspace_id) {
                    // User is already associated with a workspace, go to dashboard
                    router.push("/dashboard");
                  } else {
                    // User needs to create or join a workspace
                    router.push("/onboarding/workspace-choice");
                  }
                }, 1500);
                return;
              } else {
                // No user id, redirect to onboarding
                setStatus("success");
                setTimeout(() => {
                  router.push("/onboarding/workspace-choice");
                }, 1500);
                return;
              }
            } catch (err) {
              console.error("Error checking workspace association:", err);
              // Default to onboarding if we can't determine status
              setStatus("success");
              setTimeout(() => {
                router.push("/onboarding/workspace-choice");
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

        // Check if user exists and if is_professional flag is not set, update it
        if (user) {
          const needsProfessionalFlagUpdate =
            !user.user_metadata.is_professional;

          if (needsProfessionalFlagUpdate) {
            console.log(
              "Professional flag not set, updating user as professional"
            );
            // Update user metadata to include is_professional flag
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                is_professional: true,
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

          // Ensure the user has a team_member record
          try {
            // Call our API endpoint to populate the team member
            if (user?.id) {
              const response = await fetch("/api/team-member/populate", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId: user.id }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                console.error("Error populating team member:", errorData);
              } else {
                console.log("Team member populated successfully");
              }
            }
          } catch (err) {
            console.error("Error populating team member:", err);
          }
        }

        // Check if the user is associated with any workspace
        try {
          if (user) {
            // First check if there are any pending invitations
            try {
              // Use our API to check workspace status (which now checks for invitations)
              if (user?.id) {
                const response = await fetch("/api/auth/check-workspace-status", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ userId: user.id }),
                });

                const data = await response.json();
                
                if (response.ok) {
                  console.log("Redirecting to:", data.redirectUrl, "Reason:", data.message);
                  setStatus("success");
                  
                  // Redirect to the URL provided by the API
                  setTimeout(() => {
                    router.push(data.redirectUrl);
                  }, 1500);
                  return;
                }
              }
            } catch (apiErr) {
              console.error("Error checking workspace status:", apiErr);
              // Continue with fallback logic if API call fails
            }

            // Fallback to direct database check if API call fails
            if (user?.id) {
              const { data: workspaceData } = await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("team_member_id", user.id)
                .single();

              setStatus("success");

              // Redirect based on workspace association
              setTimeout(() => {
                if (workspaceData && workspaceData.workspace_id) {
                  // User is already associated with a workspace, go to dashboard
                  router.push("/dashboard");
                } else {
                  // User needs to create or join a workspace
                  router.push("/onboarding/workspace-choice");
                }
              }, 1500);
              return;
            } else {
              // No user id, redirect to onboarding
              setStatus("success");
              setTimeout(() => {
                router.push("/onboarding/workspace-choice");
              }, 1500);
              return;
            }
          }
        } catch (err) {
          console.error("Error checking workspace association:", err);
          // Default to onboarding if we can't determine status
          setStatus("success");
          setTimeout(() => {
            router.push("/onboarding/workspace-choice");
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
