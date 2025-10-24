"use client";

import { UserState } from "@/lib/actions/admin-users";
import { useActionState, useEffect, useTransition } from "react";

import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { UserProfile } from "@/lib/auth";

/**
 * A form component for creating or editing a user.
 */
export default function UserForm({
  action,
  user,
  icon,
}: {
  action: (_prev: UserState, formData: FormData) => Promise<UserState>;
  user?: UserProfile;
  icon?: React.ReactNode;
}) {
  const [state, formAction, actionPending] = useActionState<
    UserState,
    FormData
  >(action, { status: "idle" });
  const [transitionPending, startTransition] = useTransition();
  const isPending = transitionPending || actionPending;

  useEffect(() => {
    if (state.status === "success")
      toast.success(state.message ?? "User saved");
    if (state.status === "error")
      toast.error(state.message ?? "Could not save user");
  }, [state.status, state.message]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Append additional value to formData
    formData.append("user_id", user?.id ?? "");
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-2 rounded-md hover:bg-muted/50 transition">
          {icon}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{user ? "Edit User" : "Create User"}</DialogTitle>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="full_name">Name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={user?.full_name ?? ""}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" defaultValue={user?.email ?? ""} />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue={user?.role ?? "user"}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Select a role"></SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="upcharge_value">Upcharge Value</Label>
                <Input
                  id="upcharge_value"
                  name="upcharge_value"
                  type="number"
                  defaultValue={user?.upcharge_value ?? 0}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="upcharge_unit">Upcharge Unit</Label>
                <Select
                  name="upcharge_unit"
                  defaultValue={user?.upcharge_unit ?? "dollars"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a unit"></SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dollars">Dollars</SelectItem>
                    <SelectItem value="percent">Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
