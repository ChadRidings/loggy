import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNavigation } from "@/components/app-navigation";
import { ArchiveClient } from "@/components/archive-client";

export default async function ArchivePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <>
      <AppNavigation />
      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-white">Log Archive</h1>
        <p className="mt-1 text-sm mb-4">Signed in as {session.user.email}</p>
        <ArchiveClient />
      </main>
    </>
  );
}
