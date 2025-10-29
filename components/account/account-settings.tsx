"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/auth";

type AccountSettingsProps = {
  profile: UserProfile;
};

export function AccountSettings({ profile }: AccountSettingsProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [profilePending, setProfilePending] = useState(false);

  const [email, setEmail] = useState(profile.email ?? "");
  const [emailPending, setEmailPending] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);

  const handleProfileSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setProfilePending(true);

    const supabase = createClient();
    const trimmedName = fullName.trim();

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: trimmedName || null })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: trimmedName || null },
      });
      if (metaError) throw metaError;

      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update profile.";
      toast.error(message);
    } finally {
      setProfilePending(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Email is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (trimmedEmail.toLowerCase() === (profile.email ?? "").toLowerCase()) {
      toast.info("That email is already on your account.");
      return;
    }

    setEmailPending(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.updateUser({
        email: trimmedEmail,
      });
      if (error) throw error;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ email: trimmedEmail })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const requiresConfirmation = Boolean(data.user?.new_email);
      toast.success(
        requiresConfirmation
          ? "Check your inbox to confirm the new email."
          : "Email updated."
      );

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update email.";
      toast.error(message);
    } finally {
      setEmailPending(false);
    }
  };

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
    <div className="w-full max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Update your personal information, email, and password.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Control how your name appears across the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Your name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={profilePending}
                autoComplete="name"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={profilePending}>
                {profilePending ? "Saving…" : "Save changes"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Tip: leave blank if you prefer to stay anonymous.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Change the email you use to sign in and receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleEmailSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={emailPending}
                autoComplete="email"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={emailPending}>
                {emailPending ? "Updating…" : "Update email"}
              </Button>
              <p className="text-xs text-muted-foreground">
                We&apos;ll send a confirmation link to the new address.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

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
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={passwordPending}
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={passwordPending}
                minLength={8}
                autoComplete="new-password"
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
    </div>
  );
}
