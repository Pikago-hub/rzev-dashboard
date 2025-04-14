"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { createBrowserClient } from "@/lib/supabase";
import { Navbar } from "@/components/sections/navbar";
import { Progress } from "@/components/ui/progress";
import { AuroraText } from "@/components/ui/aurora-text";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  OnboardingProvider,
  useOnboarding,
  ONBOARDING_STEPS,
  OnboardingPath,
} from "@/lib/onboarding-context";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);

  // Calculate progress percentage
  const progressPercentage =
    ((currentStepIndex + 1) / (ONBOARDING_STEPS.length + 1)) * 100;

  // Determine current step based on pathname
  useEffect(() => {
    if (pathname === "/onboarding") {
      // Redirect to first step if on the base onboarding path
      const firstStepPath = "/onboarding/workspace-choice" as OnboardingPath;
      router.replace(firstStepPath);
      return;
    }

    // Check if the pathname ends with any of our step paths
    const stepIndex = ONBOARDING_STEPS.findIndex((step) =>
      pathname.endsWith(step.path)
    );
    if (stepIndex !== -1) {
      setCurrentStepIndex(stepIndex);
    }
  }, [pathname, router]);

  // Redirect to auth if not logged in or to dashboard if onboarding is complete
  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      if (!authLoading) {
        if (!user) {
          const authPath = "/auth" as const;
          router.push(authPath);
          return;
        }

        // Check if onboarding is already complete
        setIsCheckingOnboarding(true);
        try {
          const response = await fetch("/api/auth/check-workspace-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: user.id }),
          });

          const data = await response.json();

          // If onboarding is complete, redirect to dashboard
          if (data.status === "success") {
            console.log(
              "Onboarding already complete, redirecting to dashboard"
            );
            router.push("/dashboard");
          }
        } catch (err) {
          console.error("Error checking workspace status:", err);
          // Continue with onboarding if there's an error checking status
        } finally {
          setIsCheckingOnboarding(false);
        }
      }
    };

    checkAuthAndOnboarding();
  }, [user, authLoading, router]);

  const handleBack = useCallback(async () => {
    if (currentStepIndex > 0) {
      // Special case for join-workspace - always go back to workspace-choice
      if (ONBOARDING_STEPS[currentStepIndex].key === "joinWorkspace") {
        const workspaceChoiceIndex = ONBOARDING_STEPS.findIndex(
          (step) => step.key === "workspaceChoice"
        );
        if (workspaceChoiceIndex !== -1) {
          router.push(ONBOARDING_STEPS[workspaceChoiceIndex].path);
          return;
        }
      }
      // Special case for services-offer - always go back to create-workspace or join-workspace
      else if (ONBOARDING_STEPS[currentStepIndex].key === "servicesOffer") {
        // Check if the user came from create-workspace or join-workspace
        try {
          if (user) {
            const supabase = createBrowserClient();
            const { data: joinRequestData } = await supabase
              .from("workspace_join_requests")
              .select("id")
              .eq("team_member_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1);

            // If there's a recent join request, go back to join-workspace
            if (joinRequestData && joinRequestData.length > 0) {
              const joinWorkspaceIndex = ONBOARDING_STEPS.findIndex(
                (step) => step.key === "joinWorkspace"
              );
              if (joinWorkspaceIndex !== -1) {
                router.push(ONBOARDING_STEPS[joinWorkspaceIndex].path);
                return;
              }
            } else {
              // Otherwise go back to create-workspace
              const createWorkspaceIndex = ONBOARDING_STEPS.findIndex(
                (step) => step.key === "createWorkspace"
              );
              if (createWorkspaceIndex !== -1) {
                router.push(ONBOARDING_STEPS[createWorkspaceIndex].path);
                return;
              }
            }
          }
        } catch (error) {
          console.error("Error checking workspace history:", error);
          // Default to workspace-choice if there's an error
          const workspaceChoiceIndex = ONBOARDING_STEPS.findIndex(
            (step) => step.key === "workspaceChoice"
          );
          if (workspaceChoiceIndex !== -1) {
            router.push(ONBOARDING_STEPS[workspaceChoiceIndex].path);
            return;
          }
        }
      }
      // Special cases for navigation
      else if (
        ONBOARDING_STEPS[currentStepIndex].key === "currentSoftware" ||
        ONBOARDING_STEPS[currentStepIndex].key === "businessLocation"
      ) {
        // Check if we should go back to service locations or business location
        try {
          if (user) {
            const supabase = createBrowserClient();
            const { data: workspaceMemberData, error: workspaceMemberError } =
              await supabase
                .from("workspace_members")
                .select("workspace_id")
                .eq("team_member_id", user.id)
                .single();

            if (workspaceMemberError) {
              console.error(
                "Error fetching workspace member:",
                workspaceMemberError
              );
              // Default to previous step if there's an error
              const prevPath = ONBOARDING_STEPS[currentStepIndex - 1].path;
              router.push(prevPath);
              return;
            }

            if (!workspaceMemberData?.workspace_id) {
              console.error("No workspace found for user");
              // Default to previous step if no workspace found
              const prevPath = ONBOARDING_STEPS[currentStepIndex - 1].path;
              router.push(prevPath);
              return;
            }

            const { data, error } = await supabase
              .from("workspaces")
              .select("service_locations")
              .eq("id", workspaceMemberData.workspace_id)
              .single();

            if (!error && data && data.service_locations) {
              console.log("Service locations from DB:", data.service_locations);

              // Parse the service locations
              const serviceLocations = Array.isArray(data.service_locations)
                ? data.service_locations
                : typeof data.service_locations === "string"
                  ? JSON.parse(data.service_locations)
                  : data.service_locations;

              // If client location only, skip business location page
              if (
                Array.isArray(serviceLocations) &&
                serviceLocations.length === 1 &&
                serviceLocations[0] === "clientLocation"
              ) {
                const serviceLocationsIndex = ONBOARDING_STEPS.findIndex(
                  (step) => step.key === "serviceLocations"
                );
                if (serviceLocationsIndex !== -1) {
                  router.push(ONBOARDING_STEPS[serviceLocationsIndex].path);
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.error("Error checking service locations:", error);
        }
      }

      // Default behavior - go to previous step
      const prevPath = ONBOARDING_STEPS[currentStepIndex - 1].path;
      router.push(prevPath);
    }
  }, [currentStepIndex, router, user]);

  // Show loading state while checking auth or onboarding status
  if (authLoading || isCheckingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return (
    <OnboardingProvider>
      <OnboardingContent
        currentStepIndex={currentStepIndex}
        progressPercentage={progressPercentage}
        handleBack={handleBack}
        t={t}
      >
        {children}
      </OnboardingContent>
    </OnboardingProvider>
  );
}

function OnboardingContent({
  children,
  currentStepIndex,
  progressPercentage,
  handleBack,
  t,
}: {
  children: React.ReactNode;
  currentStepIndex: number;
  progressPercentage: number;
  handleBack: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  // Get the onboarding context values
  const { triggerSubmit, isSubmitting } = useOnboarding();

  // Create a handleNext function that uses the context's triggerSubmit
  const handleNext = useCallback(() => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      triggerSubmit();
    }
  }, [currentStepIndex, triggerSubmit]);
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col items-center p-4 md:p-8">
        <div className="w-full max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tighter md:text-5xl">
              {t("title")} <AuroraText>{t("businessSetup")}</AuroraText>
            </h1>
          </div>

          {/* Progress bar */}
          <div className="mb-8 w-full">
            <div className="flex justify-center mb-2">
              <div className="text-lg font-medium text-primary">
                {currentStepIndex < ONBOARDING_STEPS.length
                  ? t(`steps.${ONBOARDING_STEPS[currentStepIndex].key}`)
                  : t("steps.complete")}
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Content */}
          <div className="w-full">{children}</div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t("navigation.back")}
            </Button>

            {currentStepIndex < ONBOARDING_STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  <>
                    {t("navigation.next")}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={triggerSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("navigation.finish")
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
