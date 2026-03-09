"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Form } from "radix-ui";

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const registerResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!registerResponse.ok) {
      const body = (await registerResponse.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Registration failed.");
      setLoading(false);
      return;
    }

    const signInResponse = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (!signInResponse || signInResponse.error) {
      setError("Account created, but sign-in failed. Please login manually.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <Form.Root
        onSubmit={onSubmit}
        className="w-full rounded-2xl border border-(--border) bg-(--background) p-8"
      >
        <h1 className="font-roboto-condensed text-2xl font-semibold text-lime-300">
          Create Account
        </h1>
        <p className="mt-2 text-sm">Register for Loggy.</p>

        <div className="mt-6 space-y-4">
          <Form.Field name="email" className="block text-sm font-medium">
            <Form.Label>Email</Form.Label>
            <Form.Control asChild>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-200"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Form.Control>
          </Form.Field>

          <Form.Field name="password" className="block text-sm font-medium">
            <Form.Label>Password</Form.Label>
            <Form.Control asChild>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-200"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </Form.Control>
          </Form.Field>
        </div>

        {error ? <p className="mt-4 text-sm">{error}</p> : null}

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-(--accent) px-4 py-2 text-(--textdark) disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <p className="mt-4 text-sm">
          Already have an account?{" "}
          <a href="/login" className="font-medium">
            Login
          </a>
        </p>
      </Form.Root>
    </main>
  );
}
