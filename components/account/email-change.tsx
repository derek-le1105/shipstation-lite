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
import { UserProfile } from "@/lib/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  profile: UserProfile;
};

export default function EmailChange({ profile }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState(profile.email ?? "");
  const [emailPending, setEmailPending] = useState(false);

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
  return (
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
  );
}
