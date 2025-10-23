"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  createUserInviteAction,
  type CreateUserState,
} from "@/lib/actions/admin-users";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<
    CreateUserState,
    FormData
  >(createUserInviteAction, { status: "idle" });

  if (state.status === "success") {
    toast.success(state.message ?? "User invited", {
      description: state.email,
    });
  }

  if (state.status === "error") {
    toast.error(state.message ?? "Could not create user");
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-2 md:col-span-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              disabled={pending}
              placeholder="user@example.com"
            />
          </div>
          <div className="grid gap-2 md:col-span-1">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              disabled={pending}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-2 md:col-span-1">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="user"
              disabled={pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create user"}
            </Button>
          </div>

          {state.status === "error" ? (
            <div className="md:col-span-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {state.message}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
