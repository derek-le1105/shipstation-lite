"use client";
import { Ellipsis, Loader2 } from "lucide-react";
import { UserProfile } from "@/lib/auth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfileAction } from "@/lib/actions/profiles";
import { toast } from "sonner";
import { useFormStatus } from "react-dom";

export default function EditUserModal({ user }: { user: UserProfile }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="p-2 rounded-md hover:bg-muted/50 transition">
          <Ellipsis />
        </button>
      </DialogTrigger>
      <DialogContent>
        <form
          action={async (formData) => {
            console.log("submitted");
            try {
              formData.append("user_id", user.id);
              const data = await updateProfileAction(formData);
              console.log("data", data);
              toast.success("User profile updated successfully.");
            } catch (error) {
              console.log("error", error);
              toast.error("Failed to update user profile.");
            }
          }}
        >
          <DialogTitle>Edit User</DialogTitle>
          <div className="grid gap-4 pt-4">
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
              <Select name="role" defaultValue={user?.role ?? ""}>
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
                  defaultValue={user?.upcharge_value ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="upcharge_unit">Upcharge Unit</Label>
                <Select
                  name="upcharge_unit"
                  defaultValue={user?.upcharge_unit ?? ""}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a unit"></SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dollar">Dollar</SelectItem>
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
            <SaveChangesButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SaveChangesButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
        </>
      ) : (
        "Save Changes"
      )}
    </Button>
  );
}
