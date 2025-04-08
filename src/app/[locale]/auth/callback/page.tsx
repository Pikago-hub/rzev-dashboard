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

      setStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    };

    handleOAuthCallback();
  }, [router, supabase, t]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        {status === "loading" && (
          <>
            <h1 className="text-2xl font-bold">{t("loading")}</h1>
            <div className="flex justify-center">
              <svg
                className="animate-spin h-8 w-8 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold">{t("success")}</h1>
            <p>{t("redirecting")}</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold">{t("error")}</h1>
            <p>
              Please try again or contact support if the problem persists.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
