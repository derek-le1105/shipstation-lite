"use server";

import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/supabase.types";
import { revalidatePath } from "next/cache";

export type FormSource = "web" | "android" | "ios" | undefined;

export type FeedbackActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function getTrimmedString(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRating(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isNaN(numeric)) {
    throw new Error("Rating must be a number.");
  }

  if (numeric < 1 || numeric > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  return numeric;
}

function parseSource(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "web";
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return "web";
  }

  if (trimmed === "ios" || trimmed === "android" || trimmed === "web") {
    return trimmed;
  }

  return "web";
}

export async function submitIssueAction(
  _: FeedbackActionState,
  formData: FormData
): Promise<FeedbackActionState> {
  try {
    const profile = await requireUserProfile();

    const subject = getTrimmedString(formData, "subject");
    const details = getTrimmedString(formData, "details");

    const issue_type = formData.get("issue_type") as string;
    const issue_section = formData.get("issue_section") as string;

    if (!subject) throw new Error("Please add a subject");

    if (!details) throw new Error("Please add details");

    const payload: TablesInsert<"app_feedback"> = {
      subject,
      details,
      issue_type,
      issue_section,
      user_id: profile.id,
    };
    const supabase = await createClient();
    const { error } = await supabase.from("app_feedback").insert(payload);

    if (error) {
      console.log(error);
      throw error;
    }
    revalidatePath("/feedback");
    return { status: "success", message: "Thank you for your submission" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We couldn't submit your feedback. Please try again.";
    return { status: "error", message };
  }
}
