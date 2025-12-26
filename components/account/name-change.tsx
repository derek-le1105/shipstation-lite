"use client";

import { useRouter } from "next/navigation";
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
import { UserProfile } from "@/lib/auth";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Props = {
  profile: UserProfile;
};

export default function NameChange({ profile }: Props) {
  const router = useRouter();

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [profilePending, setProfilePending] = useState(false);

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

  return (
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
