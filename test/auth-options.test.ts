import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthorizeFn = (credentials: unknown) => Promise<unknown>;

async function loadAuthModule() {
  vi.resetModules();

  const verifyUserPassword = vi.fn();
  vi.doMock("@/lib/users", () => ({
    verifyUserPassword
  }));

  const module = await import("@/auth");
  return {
    authOptions: module.authOptions,
    verifyUserPassword
  };
}

function getAuthorize(authOptions: { providers?: unknown[] }): AuthorizeFn {
  const provider = authOptions.providers?.[0] as unknown;

  if (!provider || typeof provider !== "object") {
    throw new Error("Credentials provider was not found.");
  }

  if ("options" in provider && provider.options && typeof provider.options === "object") {
    const options = provider.options as { authorize?: AuthorizeFn };
    if (typeof options.authorize === "function") {
      return options.authorize;
    }
  }

  if ("authorize" in provider && typeof provider.authorize === "function") {
    return provider.authorize as AuthorizeFn;
  }

  throw new Error("Credentials provider authorize() was not found.");
}

describe("authOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // Ensures authorize rejects malformed credentials early and never calls user verification.
  it("returns null when authorize receives invalid credentials payload", async () => {
    const { authOptions, verifyUserPassword } = await loadAuthModule();
    const authorize = getAuthorize(authOptions);

    const result = await authorize({ email: "not-an-email", password: "short" });

    expect(result).toBeNull();
    expect(verifyUserPassword).not.toHaveBeenCalled();
  });

  // Verifies authorize forwards validated credentials to verifyUserPassword and returns the resolved user.
  it("delegates valid credentials to verifyUserPassword and returns the user", async () => {
    const { authOptions, verifyUserPassword } = await loadAuthModule();
    const authorize = getAuthorize(authOptions);

    verifyUserPassword.mockResolvedValue({ id: "user-1", email: "alice@example.com" });

    const result = await authorize({
      email: "alice@example.com",
      password: "password123"
    });

    expect(verifyUserPassword).toHaveBeenCalledWith("alice@example.com", "password123");
    expect(result).toEqual({ id: "user-1", email: "alice@example.com" });
  });

  // Confirms jwt callback overwrites token identity fields from the signed-in user object.
  it("sets token sub and email in jwt callback when user exists", async () => {
    const { authOptions } = await loadAuthModule();
    const token = { sub: "existing", email: "old@example.com" };

    const result = await authOptions.callbacks?.jwt?.({
      token,
      user: { id: "user-1", email: "alice@example.com" },
      account: null,
      profile: undefined,
      trigger: "signIn",
      session: undefined,
      isNewUser: false
    } as never);

    expect(result).toEqual({ sub: "user-1", email: "alice@example.com" });
  });

  // Ensures jwt callback leaves existing token fields unchanged when no user is supplied.
  it("preserves token in jwt callback when user does not exist", async () => {
    const { authOptions } = await loadAuthModule();
    const token = { sub: "user-2", email: "keep@example.com" };

    const result = await authOptions.callbacks?.jwt?.({
      token,
      user: null,
      account: null,
      profile: undefined,
      trigger: "update",
      session: undefined,
      isNewUser: false
    } as never);

    expect(result).toEqual({ sub: "user-2", email: "keep@example.com" });
  });

  // Verifies session callback maps token.sub into session.user.id for client-side user identity access.
  it("copies token.sub to session.user.id when both are present", async () => {
    const { authOptions } = await loadAuthModule();
    const session = {
      user: { email: "a@example.com" },
      expires: "2099-01-01T00:00:00.000Z"
    };

    const result = await authOptions.callbacks?.session?.({
      session,
      token: { sub: "user-9" },
      user: {
        id: "user-9",
        email: "a@example.com",
        emailVerified: null
      },
      newSession: session,
      trigger: "update"
    } as never);

    expect((result as { user?: { id?: string } } | undefined)?.user?.id).toBe("user-9");
  });

  // Confirms session callback does not inject an id when token.sub is absent, preserving the existing session payload.
  it("does not set session.user.id when token.sub is missing", async () => {
    const { authOptions } = await loadAuthModule();
    const session = {
      user: { email: "a@example.com" },
      expires: "2099-01-01T00:00:00.000Z"
    };

    const result = await authOptions.callbacks?.session?.({
      session,
      token: {},
      user: {
        id: "user-1",
        email: "a@example.com",
        emailVerified: null
      },
      newSession: session,
      trigger: "update"
    } as never);

    expect(result).toEqual({
      user: { email: "a@example.com" },
      expires: "2099-01-01T00:00:00.000Z"
    });
    expect((result as { user?: { id?: string } } | undefined)?.user?.id).toBeUndefined();
  });
});
