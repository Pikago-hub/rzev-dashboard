import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface PasswordFormProps {
  translationFunc: (key: string) => string;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const PasswordForm = ({
  translationFunc: t,
  changePassword,
}: PasswordFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Password validation
  const validatePassword = () => {
    if (newPassword.length < 8) {
      setPasswordError(t("security.passwordTooShort"));
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError(t("security.passwordsDontMatch"));
      return false;
    }
    
    setPasswordError("");
    return true;
  };
  
  // Handle password change
  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    
    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      
      toast({
        title: t("common.success"),
        description: t("security.passwordChangedLogout"),
      });

      // Short delay before redirecting to login page
      setTimeout(() => {
        router.push("/auth");
      }, 2000);
      
    } catch (error: unknown) {
      console.error("Error changing password:", error);
      const errorMessage = error instanceof Error ? error.message : t("security.changePasswordError");
      setPasswordError(errorMessage);
      
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      {passwordError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{passwordError}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="current-password">
          {t("security.currentPassword")}
        </Label>
        <div className="relative">
          <Input
            id="current-password"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">
              {showCurrentPassword ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="new-password">
          {t("security.newPassword")}
        </Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">
              {showNewPassword ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("security.passwordRequirements")}
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password">
          {t("security.confirmPassword")}
        </Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={handleChangePassword}
          disabled={isChangingPassword}
        >
          {isChangingPassword
            ? t("common.loading")
            : t("security.changePassword")}
        </Button>
      </div>
    </>
  );
}; 