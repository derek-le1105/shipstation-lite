"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export const metadata = {
  title: "UNS Shipping Manager - New Password",
};

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {}, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password too short", {
        description: "Use at least 8 characters.",
      });
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      console.log("userRes:", userRes);
      if (!userRes.user) {
        toast.error(
          "Your session has expired. Please use the invite link again."
        );
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password set successfully");
      router.replace("/dashboard");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update password. Try again."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Set your password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={pending}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save password"}
            </Button>
            <p className="text-xs text-muted-foreground">
              You were signed in via your invite link. After setting a password,
              you can log in normally.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
