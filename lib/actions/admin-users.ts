"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserState = {
  status: "idle" | "success" | "error";
  message?: string;
  userId?: string;
  email?: string;
};

export async function createUserInviteAction(
  _prev: UserState,
  formData: FormData
): Promise<UserState> {
  try {
    await requireAdminProfile();

    const emailRaw = formData.get("email");
    const fullNameRaw = formData.get("full_name");
    const roleRaw = formData.get("role");

    const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
    const full_name =
      typeof fullNameRaw === "string" && fullNameRaw.trim().length > 0
        ? fullNameRaw.trim()
        : null;
    const role = (
      typeof roleRaw === "string" ? roleRaw.toLowerCase() : "user"
    ) as "user" | "admin";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        status: "error",
        message: "Please provide a valid email address.",
      };
    }
    if (role !== "user" && role !== "admin") {
      return {
        status: "error",
        message: "Invalid role. Must be user or admin.",
      };
    }

    const admin = createAdminClient();

    // Determine redirect URL for invite link
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const redirectTo = `${baseUrl}/auth/callback`;
    console.log("redirectTo:", redirectTo);
    // Send an invite so the user sets their own password.
    const inviteRes = await admin.auth.admin.inviteUserByEmail(email, {
      data: full_name ? { full_name } : undefined,
      redirectTo,
    });

    if (inviteRes.error) {
      // If user already exists, proceed to ensure profile.
      if (
        inviteRes.error.message?.toLowerCase().includes("already registered")
      ) {
        // Fetch the user by email to get ID
        const userRes = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        const existing = userRes.data.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (!existing) {
          return { status: "error", message: inviteRes.error.message };
        }
        await ensureProfileRow(admin, existing.id, email, full_name, role);
        revalidatePath("/admin");
        return {
          status: "success",
          userId: existing.id,
          email,
          message: "User already existed; profile updated.",
        };
      }
      return { status: "error", message: inviteRes.error.message };
    }

    const user = inviteRes.data.user;
    if (!user) {
      return { status: "error", message: "Invite failed: no user returned." };
    }

    await ensureProfileRow(admin, user.id, email, full_name, role);

    revalidatePath("/admin");
    return {
      status: "success",
      userId: user.id,
      email,
      message: "Invitation sent.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create user.";
    return { status: "error", message };
  }
}

async function ensureProfileRow(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  full_name: string | null,
  role: "user" | "admin"
) {
  const { data: existing, error: selErr } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.id) {
    const { error: updErr } = await admin
      .from("profiles")
      .update({ email, full_name, role })
      .eq("id", userId);
    if (updErr) throw updErr;
  } else {
    const { error: insErr } = await admin
      .from("profiles")
      .insert({ id: userId, email, full_name, role });
    if (insErr) throw insErr;
  }
}
