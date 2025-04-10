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

  // Calculate progress percentage
  const progressPercentage =
    ((currentStepIndex + 1) / (ONBOARDING_STEPS.length + 1)) * 100;

  // Determine current step based on pathname
  useEffect(() => {
    if (pathname === "/onboarding") {
      // Redirect to first step if on the base onboarding path
      const firstStepPath = "/onboarding/business-info" as OnboardingPath;
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

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      const authPath = "/auth" as const;
      router.push(authPath);
    }
  }, [user, authLoading, router]);

  const handleBack = useCallback(async () => {
    console.log(
      "Back button clicked from step:",
      ONBOARDING_STEPS[currentStepIndex].key
    );

    if (currentStepIndex > 0) {
      // Special cases for navigation
      if (
        ONBOARDING_STEPS[currentStepIndex].key === "currentSoftware" ||
        ONBOARDING_STEPS[currentStepIndex].key === "businessLocation"
      ) {
        // Check if we should go back to service locations or business location
        try {
          if (user) {
            const supabase = createBrowserClient();
            const { data, error } = await supabase
              .from("merchant_profiles")
              .select("service_locations")
              .eq("id", user.id)
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
                console.log(
                  "Client location only, skipping business location page"
                );
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

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
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
