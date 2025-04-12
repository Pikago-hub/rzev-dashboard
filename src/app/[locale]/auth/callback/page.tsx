"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/sections/navbar";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const t = useTranslations("auth.callback");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Handle hash fragment for OAuth providers
        if (window.location.hash.includes("access_token")) {
          const hash = window.location.hash;
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            // First set the session client-side
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

            // Then call the server-side API to handle the rest of the auth flow
            const response = await fetch("/api/auth/callback", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                accessToken: access_token,
                refreshToken: refresh_token,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("Error in auth callback API:", errorData);
              setStatus("error");
              toast({
                title: t("error"),
                description: errorData.error || t("unexpectedError"),
                variant: "destructive",
              });
              return;
            }

            const data = await response.json();
            setStatus(data.status);

            // Redirect based on the server's response
            setTimeout(() => {
              router.push(data.redirectUrl || "/dashboard");
            }, 1500);
            return;
          }
        }

        // If we get here, check if we already have a session
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData.session) {
          // We have a session, call the server API to handle the rest
          const response = await fetch("/api/auth/callback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              accessToken: sessionData.session.access_token,
              refreshToken: sessionData.session.refresh_token,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error in auth callback API:", errorData);
            setStatus("error");
            toast({
              title: t("error"),
              description: errorData.error || t("unexpectedError"),
              variant: "destructive",
            });
            return;
          }

          const data = await response.json();
          setStatus(data.status);

          // Redirect based on the server's response
          setTimeout(() => {
            router.push(data.redirectUrl || "/dashboard");
          }, 1500);
          return;
        }

        // Fallback if no session or tokens found
        setStatus("error");
        toast({
          title: t("error"),
          description: t("noSession"),
          variant: "destructive",
        });
      } catch (error) {
        console.error("Unexpected error during auth callback:", error);
        setStatus("error");
        toast({
          title: t("error"),
          description: t("unexpectedError"),
          variant: "destructive",
        });
      }
    };

    handleOAuthCallback();
  }, [router, supabase, t]);

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
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
    </>
  );
}
