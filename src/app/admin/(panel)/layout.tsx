import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | UniUnlocker Admin" },
  robots: { index: false, follow: false },
};

// Nothing in the panel renders until the session has been verified on the server.
async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div role="status" aria-label="Loading" className="min-h-screen space-y-4 bg-admin-bg p-6 lg:pl-66">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      }
    >
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
