"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { useRouter, usePathname } from "@/i18n/navigation";

// Create a context for form submission
export type OnboardingContextType = {
  triggerSubmit: () => void;
  setSubmitHandler: (handler: () => Promise<boolean>) => void;
  isSubmitting: boolean;
};

const OnboardingContext = createContext<OnboardingContextType>({
  triggerSubmit: () => {},
  setSubmitHandler: () => {},
  isSubmitting: false,
});

// Hook to use the onboarding context
export const useOnboarding = () => useContext(OnboardingContext);

// Define the onboarding steps with typed paths
export type OnboardingPath =
  | "/onboarding/workspace-choice"
  | "/onboarding/create-workspace"
  | "/onboarding/join-workspace"
  | "/onboarding/services-offer"
  | "/onboarding/service-locations"
  | "/onboarding/business-location"
  | "/onboarding/current-software"
  | "/onboarding/heard-about-us";

export const ONBOARDING_STEPS = [
  {
    path: "/onboarding/workspace-choice" as OnboardingPath,
    key: "workspaceChoice",
  },
  {
    path: "/onboarding/create-workspace" as OnboardingPath,
    key: "createWorkspace",
  },
  {
    path: "/onboarding/join-workspace" as OnboardingPath,
    key: "joinWorkspace",
  },
  {
    path: "/onboarding/services-offer" as OnboardingPath,
    key: "servicesOffer",
  },
  {
    path: "/onboarding/service-locations" as OnboardingPath,
    key: "serviceLocations",
  },
  {
    path: "/onboarding/business-location" as OnboardingPath,
    key: "businessLocation",
  },
  {
    path: "/onboarding/current-software" as OnboardingPath,
    key: "currentSoftware",
  },
  { path: "/onboarding/heard-about-us" as OnboardingPath, key: "heardAboutUs" },
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Use a ref to store the submit handler to avoid re-renders
  const submitHandlerRef = useRef<() => Promise<boolean>>(() =>
    Promise.resolve(false)
  );

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

  const setSubmitHandler = useCallback((handler: () => Promise<boolean>) => {
    submitHandlerRef.current = handler;
  }, []);

  // Handle navigation after form submission
  const handleNavigation = useCallback(
    async (success: boolean) => {
      if (success && currentStepIndex < ONBOARDING_STEPS.length - 1) {
        // Special case for workspace choice page - we'll let it handle its own navigation
        if (ONBOARDING_STEPS[currentStepIndex].key === "workspaceChoice") {
          // We don't navigate here - the workspace choice page will handle it
          return;
        }
        // Special case for create workspace page - go directly to services-offer
        else if (ONBOARDING_STEPS[currentStepIndex].key === "createWorkspace") {
          // Go directly to services-offer
          const servicesOfferIndex = ONBOARDING_STEPS.findIndex(
            (step) => step.key === "servicesOffer"
          );
          if (servicesOfferIndex !== -1) {
            const servicesOfferPath = ONBOARDING_STEPS[servicesOfferIndex].path;
            router.push(servicesOfferPath);
          }
          return;
        }
        // Special case for service locations page - we'll handle navigation there
        else if (
          ONBOARDING_STEPS[currentStepIndex].key === "serviceLocations"
        ) {
          // We don't navigate here - the service locations page will handle it
          return;
        } else if (
          ONBOARDING_STEPS[currentStepIndex].key === "businessLocation"
        ) {
          // After business location, always go to current software
          const softwareIndex = ONBOARDING_STEPS.findIndex(
            (step) => step.key === "currentSoftware"
          );
          if (softwareIndex !== -1) {
            const nextPath = ONBOARDING_STEPS[softwareIndex].path;
            router.push(nextPath);
          }
        } else {
          // Normal navigation to the next step
          const nextPath = ONBOARDING_STEPS[currentStepIndex + 1].path;
          router.push(nextPath);
        }
      } else if (success && currentStepIndex === ONBOARDING_STEPS.length - 1) {
        // If this is the last step and successful, redirect to dashboard
        router.push("/dashboard");
      }
    },
    [currentStepIndex, router]
  );

  const triggerSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const handler = submitHandlerRef.current;

      if (typeof handler !== "function") {
        console.error("submitHandler is not a function in context", handler);
        setIsSubmitting(false);
        return;
      }

      const success = await handler();

      // Handle navigation based on the result
      await handleNavigation(success);

      return success;
    } catch (error) {
      console.error("Error during form submission:", error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, handleNavigation]);

  // Create the context value
  const contextValue: OnboardingContextType = {
    triggerSubmit,
    setSubmitHandler,
    isSubmitting,
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}
