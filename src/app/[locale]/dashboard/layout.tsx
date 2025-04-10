"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { createBrowserClient } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading) {
        if (!user) {
          router.push("/auth");
          return;
        }

        // Check if the user has completed onboarding
        const supabase = createBrowserClient();
        try {
          const { data: profileData } = await supabase
            .from("merchant_profiles")
            .select("onboarding_complete")
            .eq("id", user.id)
            .single();

          if (!profileData?.onboarding_complete) {
            router.push("/onboarding/business-info");
          }
        } catch (err) {
          console.error("Error checking onboarding status:", err);
        }
      }
    };

    checkAuth();
  }, [user, isLoading, router]);

  if (isLoading) {
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
    <div className="flex flex-col flex-1 h-full min-h-screen">
      {children}
      <Toaster position="top-right" />
    </div>
  );
}
