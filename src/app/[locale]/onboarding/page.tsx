"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Redirect to the first step of onboarding
    if (!isLoading) {
      if (!user) {
        router.push("/auth");
      } else {
        router.replace("/onboarding/workspace-choice");
      }
    }
  }, [router, user, isLoading]);

  // Show loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  );
}
