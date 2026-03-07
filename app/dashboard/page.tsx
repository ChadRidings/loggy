import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-white">SOC Dashboard</h1>
      <p className="mt-1 text-sm mb-4">Signed in as {session.user.email}</p>
      <DashboardClient />
    </main>
  );
}
