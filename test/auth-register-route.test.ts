import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/users";

vi.mock("@/lib/users", () => ({
  createUser: vi.fn()
}));

async function loadRoutePost() {
  vi.resetModules();
  const module = await import("@/app/api/auth/register/route");
  return module.POST;
}

function makeRequest(body: unknown, forwardedFor = "203.0.113.1"): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": forwardedFor
    },
    body: JSON.stringify(body)
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies schema validation failure returns 400 and prevents createUser execution.
  it("returns 400 for invalid payload", async () => {
    const POST = await loadRoutePost();

    const response = await POST(makeRequest({ email: "invalid", password: "short" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid payload." });
    expect(createUser).not.toHaveBeenCalled();
  });

  // Confirms successful registration returns 201 with user data and correct createUser arguments.
  it("returns 201 and user when registration succeeds", async () => {
    const POST = await loadRoutePost();
    const mockedCreateUser = vi.mocked(createUser);

    mockedCreateUser.mockResolvedValue({ id: "user-1", email: "alice@example.com" });

    const response = await POST(makeRequest({ email: "alice@example.com", password: "password123" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "user-1", email: "alice@example.com" });
    expect(mockedCreateUser).toHaveBeenCalledWith("alice@example.com", "password123");
  });

  // Ensures database unique-constraint errors are translated into a 409 conflict response.
  it("returns 409 when createUser throws a unique violation", async () => {
    const POST = await loadRoutePost();
    const mockedCreateUser = vi.mocked(createUser);

    mockedCreateUser.mockRejectedValue({ code: "23505" });

    const response = await POST(makeRequest({ email: "alice@example.com", password: "password123" }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Email is already registered." });
  });

  // Verifies unexpected server/database failures are surfaced as a 500 registration error.
  it("returns 500 when createUser throws an unexpected error", async () => {
    const POST = await loadRoutePost();
    const mockedCreateUser = vi.mocked(createUser);

    mockedCreateUser.mockRejectedValue(new Error("db unavailable"));

    const response = await POST(makeRequest({ email: "alice@example.com", password: "password123" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to register user." });
  });

  // Confirms per-IP rate limiting blocks the 11th request after 10 successful attempts.
  it("returns 429 after exceeding rate limit for the same IP", async () => {
    const POST = await loadRoutePost();
    const mockedCreateUser = vi.mocked(createUser);

    mockedCreateUser.mockResolvedValue({ id: "user-1", email: "alice@example.com" });

    const payload = { email: "alice@example.com", password: "password123" };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await POST(makeRequest(payload, "198.51.100.10"));
      expect(response.status).toBe(201);
    }

    const limitedResponse = await POST(makeRequest(payload, "198.51.100.10"));

    expect(limitedResponse.status).toBe(429);
    expect(await limitedResponse.json()).toEqual({ error: "Too many requests." });
  });

  // Ensures rate-limit counters are isolated by client IP so one blocked IP does not block another.
  it("tracks rate limits independently per IP", async () => {
    const POST = await loadRoutePost();
    const mockedCreateUser = vi.mocked(createUser);

    mockedCreateUser.mockResolvedValue({ id: "user-1", email: "alice@example.com" });

    const payload = { email: "alice@example.com", password: "password123" };

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await POST(makeRequest(payload, "198.51.100.20"));
      expect(response.status).toBe(201);
    }

    const limitedResponse = await POST(makeRequest(payload, "198.51.100.20"));
    expect(limitedResponse.status).toBe(429);

    const otherIpResponse = await POST(makeRequest(payload, "198.51.100.21"));
    expect(otherIpResponse.status).toBe(201);
  });
});
