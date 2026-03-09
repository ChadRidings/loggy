import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNavigation } from "@/components/app-navigation";
import { UploadDetailsClient } from "@/components/upload-details-client";
import { ThickArrowLeftIcon } from "@radix-ui/react-icons";

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
    <>
      <AppNavigation />
      <main className="mx-auto w-full max-w-7xl p-6 lg:px-6 lg:py-10">
        <Link
          href="/dashboard"
          className="mb-6 text-sm flex items-center text-(--accent) hover:text-white transition-colors duration-300 ease-in-out"
        >
          <ThickArrowLeftIcon className="mr-1 inline-block" /> Back to dashboard
        </Link>
        <UploadDetailsClient uploadId={id} />
      </main>
    </>
  );
}
