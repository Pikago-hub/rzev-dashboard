"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link as IntlLink } from "@/i18n/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import PhoneNumberInput from "@/components/phone-number-input";

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
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink } = useAuth();
  const router = useRouter();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if the email exists
      const response = await fetch(
        `/api/check-user-exists?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      if (data.exists) {
        // User exists, proceed to password step
        setAuthStep(AuthStep.PASSWORD);
      } else {
        // User doesn't exist, proceed to registration
        setAuthStep(AuthStep.REGISTER);
      }
    } catch (error) {
      console.error("Error checking email:", error);
      toast({
        title: t("error"),
        description: t("emailCheckError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
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
      await signUp(email, password, {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phoneNumber,
        },
      });

      toast({
        title: t("createAccount"),
        description: t("emailVerificationRequired"),
        duration: 6000,
      });

      // Redirect to login after registration
      setAuthStep(AuthStep.PASSWORD);
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
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
            <div className="flex items-center mb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-0"
                onClick={() => setAuthStep(AuthStep.EMAIL)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>{t("backToEmail")}</span>
              </Button>
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

            <div className="relative">
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
              disabled={isSendingMagicLink}
            >
              {isSendingMagicLink ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
            <div className="flex items-center mb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-0"
                onClick={() => setAuthStep(AuthStep.EMAIL)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>{t("backToEmail")}</span>
              </Button>
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

            <PhoneNumberInput
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value || "")}
              disabled={isLoading}
              label={t("phone")}
            />

            <div className="space-y-2">
              <Label htmlFor="registerPassword">{t("password")}</Label>
              <Input
                id="registerPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creatingAccount")}
                </span>
              ) : (
                t("createAccount")
              )}
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>{renderAuthForm()}</CardContent>
      </Card>
    </div>
  );
}
