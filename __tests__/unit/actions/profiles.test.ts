import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
  upsertUserUpcharge: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { updateProfileAction } from "@/lib/actions/profiles";
import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient, upsertUserUpcharge } from "@/lib/supabase/admin";

type MockUserProfile = Awaited<ReturnType<typeof requireAdminProfile>>;

const profile: MockUserProfile = {
  id: "user-1",
  email: "user@example.com",
  full_name: "User",
  role: "admin",
  created_at: "",
  updated_at: "",
  warehouse_id: 321,
};

function setFormValue(formData: FormData, key: string, value: string) {
  formData.set(key, value);
}

function buildFormData() {
  const formData = new FormData();
  setFormValue(formData, "user_id", "user-2");
  setFormValue(formData, "email", "test@email.com");
  setFormValue(formData, "full_name", "USER");
  setFormValue(formData, "role", "user");
  setFormValue(formData, "warehouse_id", "123456");
  setFormValue(formData, "upcharge_value", "12.34");
  setFormValue(formData, "upcharge_unit", "percent");
  return formData;
}

function createSupabaseStub() {
  const responses = {
    maybeSingle: { data: null as any, error: null as any },
    single: { data: null as any, error: null as any },
    selectAwait: { data: null as any, error: null as any },
  };

  const query: any = {
    select: vi.fn((_columns?: string) => query),
    update: vi.fn((_values: unknown) => query),
    eq: vi.fn((_col: string, _val: unknown) => query),
    maybeSingle: vi.fn(async () => responses.maybeSingle),
    single: vi.fn(async () => responses.single),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(responses.selectAwait).then(onFulfilled, onRejected),
  };

  const supabase = {
    from: vi.fn((_table: string) => query),
  };

  return { supabase, query, responses };
}

let supabaseQuery: any;
let supabaseResponses: ReturnType<typeof createSupabaseStub>["responses"];

beforeEach(() => {
  vi.mocked(requireAdminProfile).mockResolvedValue(profile);

  const { supabase, query, responses } = createSupabaseStub();
  supabaseQuery = query;
  supabaseResponses = responses;
  responses.single = { data: { id: "user-2" }, error: null };

  vi.mocked(createAdminClient).mockReturnValue(supabase as any);
  vi.mocked(upsertUserUpcharge).mockResolvedValue({ error: null } as any);
});

describe("updateProfileAction", () => {
  it("successfully updates a user's profile and revalidates", async () => {
    const formData = buildFormData();

    const result = await updateProfileAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "success",
      userId: "user-2",
      email: "test@email.com",
      message: "Profile updated.",
    });

    expect(vi.mocked(createAdminClient)).toHaveBeenCalledTimes(1);
    expect(supabaseQuery.update).toHaveBeenCalledWith({
      email: "test@email.com",
      full_name: "USER",
      role: "user",
      warehouse_id: 123456,
    });
    expect(supabaseQuery.eq).toHaveBeenCalledWith("id", "user-2");

    expect(vi.mocked(upsertUserUpcharge)).toHaveBeenCalledWith(
      "user-2",
      "percent",
      12.34
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin/users");
  });

  it("throws when current user is not an admin", async () => {
    vi.mocked(requireAdminProfile).mockResolvedValue({
      ...(profile as any),
      role: "user",
    });

    await expect(
      updateProfileAction({ status: "idle" }, buildFormData())
    ).rejects.toThrow("You do not have permission to update this profile.");

    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
    expect(vi.mocked(upsertUserUpcharge)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("throws when the profile update fails", async () => {
    const dbError = new Error("DB failed");
    supabaseResponses.single = { data: null, error: dbError };

    await expect(
      updateProfileAction({ status: "idle" }, buildFormData())
    ).rejects.toThrow("DB failed");

    expect(vi.mocked(upsertUserUpcharge)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("throws when upsertUserUpcharge returns an error", async () => {
    vi.mocked(upsertUserUpcharge).mockResolvedValue({
      error: new Error("Upcharge failed"),
    } as any);

    await expect(
      updateProfileAction({ status: "idle" }, buildFormData())
    ).rejects.toThrow("Upcharge failed");

    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});
