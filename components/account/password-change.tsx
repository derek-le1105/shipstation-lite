"use client";

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
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordChange() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPasswordPending(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      toast.success("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update password.";
      toast.error(message);
    } finally {
      setPasswordPending(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Choose a strong password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handlePasswordSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              name="new_password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={passwordPending}
              minLength={8}
              autoComplete="new-password"
              endAdornment={
                showPassword ? (
                  <button
                    type="button"
                    aria-label="Hide password"
                    className="cursor-pointer bg-transparent border-none p-0"
                    onClick={() => setShowPassword(false)}
                  >
                    <EyeOff />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Show password"
                    className="cursor-pointer bg-transparent border-none p-0"
                    onClick={() => setShowPassword(true)}
                  >
                    <Eye />
                  </button>
                )
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={passwordPending}
              minLength={8}
              autoComplete="new-password"
              endAdornment={
                showPassword ? (
                  <EyeOff
                    className="cursor-pointer"
                    onClick={() => setShowPassword(false)}
                  />
                ) : (
                  <Eye
                    className="cursor-pointer"
                    onClick={() => setShowPassword(true)}
                  />
                )
              }
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={passwordPending}>
              {passwordPending ? "Updating…" : "Update password"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Passwords must be at least 8 characters long.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
