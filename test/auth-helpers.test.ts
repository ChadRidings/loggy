import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { requireApiUser } from "@/lib/auth-helpers";

vi.mock("@/auth", () => ({
  auth: vi.fn()
}));

describe("requireApiUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns userId and null response when session contains a user id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", email: "alice@example.com" } } as never);

    const result = await requireApiUser();

    expect(result).toEqual({ userId: "user-1", response: null });
  });

  it("returns 401 response when session is missing or invalid", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await requireApiUser();

    expect(result.userId).toBeNull();
    expect(result.response?.status).toBe(401);
    await expect(result.response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
