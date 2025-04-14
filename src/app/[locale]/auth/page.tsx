"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link as IntlLink } from "@/i18n/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createBrowserClient } from "@/lib/supabase";
import { useRouter } from "@/i18n/navigation";
import PhoneNumberInput from "@/components/phone-number-input";
import { AuroraText } from "@/components/ui/aurora-text";
import { Navbar } from "@/components/sections/navbar";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

// Auth flow steps
enum AuthStep {
  EMAIL,
  PASSWORD,
  REGISTER,
}

export default function AuthPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [authStep, setAuthStep] = useState(AuthStep.EMAIL);
  const {
    user,
    isLoading: authLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithMagicLink,
  } = useAuth();
  const router = useRouter();

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      // Check if the user has completed onboarding using server-side API
      const checkWorkspaceStatus = async () => {
        try {
          const response = await fetch("/api/auth/check-workspace-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: user.id }),
          });

          const data = await response.json();

          if (response.ok) {
            console.log(
              "Redirecting to:",
              data.redirectUrl,
              "Reason:",
              data.message
            );

            // Handle pending invitation case
            if (data.status === "invitation_pending") {
              console.log(
                "Pending invitation found, redirecting to accept page"
              );
              toast({
                title: t("invitationFound"),
                description: t("redirectingToInvitation"),
              });

              // Force a hard navigation to the invitation page
              window.location.href = data.redirectUrl;
              return; // Stop execution to prevent double navigation
            }

            router.push(data.redirectUrl);
          } else {
            console.error("Error checking workspace status:", data.error);
            router.push("/onboarding/workspace-choice");
          }
        } catch (err) {
          console.error("Error checking workspace status:", err);
          // Default to workspace choice if we can't determine status
          router.push("/onboarding/workspace-choice");
        }
      };

      checkWorkspaceStatus();
    }
  }, [user, authLoading, router, t]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use our server-side API to check if user exists
      const response = await fetch("/api/check-user-exists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`Error checking email: ${response.statusText}`);
      }

      const { exists, provider } = await response.json();

      // Based on the server response, show either password or registration form
      if (exists) {
        // If the user is using a social provider, show a notification and stay on email page
        if (provider && provider !== "email") {
          toast({
            title: t("socialLoginDetected"),
            description: t("useSocialProvider", { provider }),
            duration: 5000,
          });
          // Clear the email field to prevent confusion
          setEmail("");
          return;
        }

        // User exists with email provider, show password form
        setAuthStep(AuthStep.PASSWORD);
      } else {
        // User doesn't exist, show registration form
        setAuthStep(AuthStep.REGISTER);
      }
    } catch (error) {
      console.error("Email check error:", error);
      toast({
        title: t("error"),
        description: t("emailCheckError"),
        variant: "destructive",
      });

      // Default to registration if we can't check
      setAuthStep(AuthStep.REGISTER);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);

      // Get the current user after sign in
      const supabase = createBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (user) {
        // Check workspace status using server-side API
        try {
          const response = await fetch("/api/auth/check-workspace-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: user.id }),
          });

          const data = await response.json();

          if (response.ok) {
            console.log(
              "Redirecting to:",
              data.redirectUrl,
              "Reason:",
              data.message
            );

            // Handle pending invitation case
            if (data.status === "invitation_pending") {
              console.log(
                "Pending invitation found, redirecting to accept page"
              );
              toast({
                title: t("invitationFound"),
                description: t("redirectingToInvitation"),
              });

              // Force a hard navigation to the invitation page
              window.location.href = data.redirectUrl;
              return; // Stop execution to prevent double navigation
            }

            router.push(data.redirectUrl);
          } else {
            console.error("Error checking workspace status:", data.error);
            router.push("/onboarding/workspace-choice");
          }
        } catch (err) {
          console.error("Error checking workspace status:", err);
          router.push("/onboarding/workspace-choice");
        }
      } else {
        // Fallback if no user found
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Sign in error:", error);

      // Check if it's an email confirmation error
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("Email not confirmed")) {
        toast({
          title: t("emailNotVerified"),
          description: t("emailVerificationRequired"),
          duration: 6000,
        });
      } else {
        toast({
          title: t("signInError"),
          description: t("checkCredentials"),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create display name by combining first and last name
      const displayName = `${firstName} ${lastName}`.trim();

      // Validate phone number
      if (!phoneNumber || phoneNumber.trim() === "") {
        toast({
          title: t("phoneRequired"),
          description: t("enterValidPhone"),
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      await signUp(email, password, {
        data: {
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          phone: phoneNumber, // PhoneNumberInput component already formats with country code
        },
      });

      toast({
        title: t("accountCreated"),
        description: t("checkEmailVerify"),
        duration: 5000,
      });

      // Go back to login form instead of home page
      setAuthStep(AuthStep.PASSWORD);
      setIsLoading(false);
    } catch (error) {
      console.error("Registration error:", error);

      // Check for weak password error
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "weak_password"
      ) {
        // Create a properly typed version of the error
        interface WeakPasswordError {
          code: string;
          message: string;
          weak_password?: {
            reasons: string[];
          };
        }

        const weakPasswordError = error as WeakPasswordError;
        toast({
          title: t("passwordTooWeak"),
          description: weakPasswordError.message || t("passwordRequirements"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("accountCreationError"),
          description:
            error instanceof Error ? error.message : t("tryAgainLater"),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign in error:", error);
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleMagicLinkSignIn = async () => {
    setIsSendingMagicLink(true);
    try {
      await signInWithMagicLink(email);
      toast({
        title: t("magicLinkSent"),
        description: t("magicLinkInstructions"),
      });
    } catch (error) {
      console.error("Magic link error:", error);
      toast({
        title: t("error"),
        description: t("magicLinkError"),
        variant: "destructive",
      });
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  // Go back to email step
  const backToEmail = () => {
    setAuthStep(AuthStep.EMAIL);
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhoneNumber("");
  };

  // Render the appropriate form based on the current step
  const renderAuthForm = () => {
    switch (authStep) {
      case AuthStep.EMAIL:
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  {t("loading")}
                </span>
              ) : (
                t("continue")
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
              {t("googleSignIn")}
            </Button>
          </form>
        );

      case AuthStep.PASSWORD:
        return (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={backToEmail}
                type="button"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <p className="text-sm">{email}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <IntlLink
                  href="/auth"
                  className="text-xs text-primary hover:underline"
                >
                  {t("forgotPassword")}
                </IntlLink>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isSendingMagicLink}
            >
              {isLoading ? "Signing in..." : t("signIn")}
            </Button>

            <div className="relative mt-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("orUse")}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleMagicLinkSignIn}
              disabled={isLoading || isSendingMagicLink}
            >
              {isSendingMagicLink ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("sendingMagicLink")}
                </span>
              ) : (
                t("useMagicLink")
              )}
            </Button>
          </form>
        );

      case AuthStep.REGISTER:
        return (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={backToEmail}
                type="button"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("backToEmail")}
              </Button>
              <p className="text-sm">{email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("firstName")}</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("lastName")}</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <PhoneNumberInput
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value || "")}
              required
              disabled={isLoading}
              label={t("phone")}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t("creatingAccount") : t("createAccount")}
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If user is authenticated, we'll redirect in the useEffect
  // This prevents a flash of the login form before redirect
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        <h1 className="text-4xl font-bold mb-8 tracking-tighter md:text-5xl">
          {t("loginTo")} <AuroraText>{t("workspace")}</AuroraText>
        </h1>
        <Card className="mx-auto max-w-md w-full">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>{renderAuthForm()}</CardContent>
        </Card>
      </div>
    </>
  );
}
