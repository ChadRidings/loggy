import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UploadDetailsClient } from "@/components/upload-details-client";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function UploadDetailsPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="mb-6 inline-block text-sm font-medium text-slate-700 underline">
        Back to dashboard
      </Link>
      <UploadDetailsClient uploadId={id} />
    </main>
  );
}
