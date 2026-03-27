import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNavigation } from "@/components/app-navigation";
import { SpottyClient } from "@/components/spotty-client";

export default async function SpottyPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <>
      <AppNavigation />
      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <h1 className="font-roboto-condensed text-2xl font-semibold text-lime-300">Spotty</h1>
        <p className="mb-6 mt-1 text-sm">
          Signed in as {session.user.email}. Tracking Spotify&apos;s public GitHub activity.
        </p>
        <SpottyClient />
      </main>
    </>
  );
}
