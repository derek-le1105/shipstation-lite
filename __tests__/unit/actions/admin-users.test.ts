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

import { createUserInviteAction } from "@/lib/actions/admin-users";
import { requireAdminProfile } from "@/lib/auth";
import { createAdminClient, upsertUserUpcharge } from "@/lib/supabase/admin";

type InviteResult = {
  data: { user?: { id: string } | null };
  error: { message?: string } | null;
};

type ListUsersResult = {
  data: { users: Array<{ id: string; email?: string | null }> };
  error: { message?: string } | null;
};

function setFormValue(formData: FormData, key: string, value: string) {
  formData.set(key, value);
}

function buildFormData(overrides?: Partial<Record<string, string>>) {
  const formData = new FormData();
  setFormValue(formData, "email", "test@example.com");
  setFormValue(formData, "full_name", "Test User");
  setFormValue(formData, "role", "user");
  setFormValue(formData, "upcharge_unit", "dollars");
  setFormValue(formData, "upcharge_value", "12.34");

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      setFormValue(formData, key, value ?? "");
    }
  }

  return formData;
}

function createAdminStub() {
  const responses = {
    invite: { data: { user: { id: "user-1" } }, error: null } as InviteResult,
    listUsers: {
      data: { users: [{ id: "user-1", email: "test@example.com" }] },
      error: null,
    } as ListUsersResult,
    maybeSingle: { data: null as any, error: null as any },
    updateAwait: { data: null as any, error: null as any },
    insertAwait: { data: null as any, error: null as any },
  };

  const selectQuery: any = {
    select: vi.fn((_columns?: string) => selectQuery),
    eq: vi.fn((_col: string, _val: unknown) => selectQuery),
    maybeSingle: vi.fn(async () => responses.maybeSingle),
  };

  const updateQuery: any = {
    eq: vi.fn((_col: string, _val: unknown) => updateQuery),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(responses.updateAwait).then(onFulfilled, onRejected),
  };

  const insertQuery: any = {
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(responses.insertAwait).then(onFulfilled, onRejected),
  };

  const fromProfiles: any = {
    select: selectQuery.select,
    update: vi.fn((_values: unknown) => updateQuery),
    insert: vi.fn((_values: unknown) => insertQuery),
    eq: selectQuery.eq,
    maybeSingle: selectQuery.maybeSingle,
  };

  const admin: any = {
    auth: {
      admin: {
        inviteUserByEmail: vi.fn(async () => responses.invite),
        listUsers: vi.fn(async () => responses.listUsers),
      },
    },
    from: vi.fn((_table: string) => fromProfiles),
  };

  return { admin, fromProfiles, selectQuery, responses };
}

beforeEach(() => {
  vi.mocked(requireAdminProfile).mockResolvedValue({} as any);
  vi.mocked(upsertUserUpcharge).mockResolvedValue({} as any);

  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.VERCEL_URL;
});

describe("createUserInviteAction", () => {
  it("returns error for invalid email (no admin calls)", async () => {
    const formData = buildFormData({ email: "not-an-email" });

    const result = await createUserInviteAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "Please provide a valid email address.",
    });
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("returns error for invalid role (no admin calls)", async () => {
    const formData = buildFormData({ role: "superadmin" });

    const result = await createUserInviteAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "Invalid role. Must be user or admin.",
    });
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("returns error for invalid upcharge value", async () => {
    const formData = buildFormData({ upcharge_value: "nope" });

    const result = await createUserInviteAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "error",
      message: "Please provide a valid upcharge value.",
    });
    expect(vi.mocked(createAdminClient)).not.toHaveBeenCalled();
  });

  it("invites a new user, inserts profile, upserts upcharge, and revalidates", async () => {
    const { admin, fromProfiles, responses } = createAdminStub();
    responses.maybeSingle = { data: null, error: null };
    responses.insertAwait = { data: null, error: null };
    responses.invite = { data: { user: { id: "user-123" } }, error: null };
    vi.mocked(createAdminClient).mockReturnValue(admin);

    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";

    const result = await createUserInviteAction(
      { status: "idle" },
      buildFormData()
    );

    expect(result).toEqual({
      status: "success",
      userId: "user-123",
      email: "test@example.com",
      message: "Invitation sent.",
    });

    expect(admin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      "test@example.com",
      expect.objectContaining({
        data: { full_name: "Test User" },
        redirectTo: "https://example.com/auth/callback",
      })
    );

    expect(fromProfiles.insert).toHaveBeenCalledWith({
      id: "user-123",
      email: "test@example.com",
      full_name: "Test User",
      role: "user",
    });
    expect(vi.mocked(upsertUserUpcharge)).toHaveBeenCalledWith(
      "user-123",
      "dollars",
      12.34
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin");
  });

  it("updates an existing profile row when already present", async () => {
    const { admin, fromProfiles, responses } = createAdminStub();
    responses.maybeSingle = { data: { id: "user-123" }, error: null };
    responses.updateAwait = { data: null, error: null };
    responses.invite = { data: { user: { id: "user-123" } }, error: null };
    vi.mocked(createAdminClient).mockReturnValue(admin);

    const result = await createUserInviteAction(
      { status: "idle" },
      buildFormData({ role: "admin", full_name: "  " })
    );

    expect(result.status).toBe("success");
    expect(fromProfiles.update).toHaveBeenCalledWith({
      email: "test@example.com",
      full_name: null,
      role: "admin",
    });
  });

  it("handles already-registered users by finding and updating their profile", async () => {
    const { admin, responses } = createAdminStub();
    responses.invite = {
      data: { user: null },
      error: { message: "User already registered" },
    };
    responses.listUsers = {
      data: { users: [{ id: "existing-1", email: "test@example.com" }] },
      error: null,
    };
    responses.maybeSingle = { data: { id: "existing-1" }, error: null };
    responses.updateAwait = { data: null, error: null };
    vi.mocked(createAdminClient).mockReturnValue(admin);

    const result = await createUserInviteAction(
      { status: "idle" },
      buildFormData()
    );

    expect(result).toEqual({
      status: "success",
      userId: "existing-1",
      email: "test@example.com",
      message: "User already existed; profile updated.",
    });
    expect(vi.mocked(upsertUserUpcharge)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin");
  });

  it("returns error when invite fails with no user", async () => {
    const { admin, responses } = createAdminStub();
    responses.invite = { data: { user: null }, error: null };
    vi.mocked(createAdminClient).mockReturnValue(admin);

    const result = await createUserInviteAction(
      { status: "idle" },
      buildFormData()
    );

    expect(result).toEqual({
      status: "error",
      message: "Invite failed: no user returned.",
    });
  });

  it("returns error when database select fails", async () => {
    const { admin, responses } = createAdminStub();
    responses.invite = { data: { user: { id: "user-123" } }, error: null };
    responses.maybeSingle = { data: null, error: new Error("DB failed") };
    vi.mocked(createAdminClient).mockReturnValue(admin);

    const result = await createUserInviteAction(
      { status: "idle" },
      buildFormData()
    );

    expect(result).toEqual({ status: "error", message: "DB failed" });
  });

  it("returns error when admin check throws", async () => {
    vi.mocked(requireAdminProfile).mockRejectedValue(new Error("No admin"));

    const result = await createUserInviteAction(
      { status: "idle" },
      buildFormData()
    );

    expect(result).toEqual({ status: "error", message: "No admin" });
  });
});
