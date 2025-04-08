"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

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
        // Get the current session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (data.session) {
          setStatus("success");

          // Redirect after a short delay
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          // If no session, redirect to login
          setTimeout(() => {
            router.push("/auth");
          }, 2000);
        }
      } catch (error) {
        console.error("Error confirming email:", error);
        setStatus("error");
        toast({
          title: t("error"),
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    };

    handleOAuthCallback();
  }, [router, supabase, t]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>{t("loading")}</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-2">
              <p className="text-xl font-medium text-green-600">
                {t("success")}
              </p>
              <p>{t("redirecting")}</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <p className="text-xl font-medium text-destructive">
                {t("error")}
              </p>
              <p>
                Please try again or contact support if the problem persists.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
