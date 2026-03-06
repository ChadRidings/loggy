"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Form } from "radix-ui";

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

export default function LoginPage() {
  const router = useRouter();
  const callbackUrl = "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!response || response.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(response.url ?? "/dashboard");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <Form.Root onSubmit={onSubmit} className="w-full rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Loggy Login</h1>
        <p className="mt-2 text-sm">Sign in with your credentials account.</p>

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
          className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 font-medium disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="mt-4 text-sm">
          Need an account?{" "}
          <a href="/register" className="font-medium">
            Register
          </a>
        </p>
      </Form.Root>
    </main>
  );
}
