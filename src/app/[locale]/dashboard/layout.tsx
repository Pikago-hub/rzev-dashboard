"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading) {
        if (!user) {
          router.push("/auth");
          return;
        }

        // Check workspace status using server-side API
        setIsCheckingStatus(true);
        try {
          const response = await fetch("/api/auth/check-workspace-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: user.id }),
          });

          const data = await response.json();

          if (data.status !== "success") {
            console.log(
              "Redirecting to:",
              data.redirectUrl,
              "Reason:",
              data.message
            );
            router.push(data.redirectUrl);
          }
        } catch (err) {
          console.error("Error checking workspace status:", err);
          router.push("/onboarding/workspace-choice");
        } finally {
          setIsCheckingStatus(false);
        }
      }
    };

    checkAuth();
  }, [user, isLoading, router]);

  if (isLoading || isCheckingStatus) {
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
    <WorkspaceProvider>
      <div className="flex flex-col flex-1 h-full min-h-screen">
        {children}
        <Toaster position="top-right" />
      </div>
    </WorkspaceProvider>
  );
}
