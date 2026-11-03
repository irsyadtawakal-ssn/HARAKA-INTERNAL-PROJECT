import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { UserProvider } from "@/components/user-context";
import { apiFetch } from "@/lib/server/api";
import type { User } from "@/lib/types";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

/** Semua halaman di grup (app) butuh sesi yang masih sah; dicek ulang ke FastAPI setiap render. */
async function AuthedShell({ children }: { children: React.ReactNode }) {
  const res = await apiFetch("/auth/me");
  if (res.status === 401) redirect("/login");
  if (!res.ok) throw new Error(`API /auth/me membalas HTTP ${res.status}`);
  const user = (await res.json()) as User;

  return (
    <UserProvider user={user}>
      <div className="flex min-h-screen max-md:flex-col">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">{children}</main>
      </div>
    </UserProvider>
  );
}

function ShellFallback() {
  return (
    <div className="flex min-h-screen max-md:flex-col">
      <div className="shrink-0 border-line bg-surface max-md:h-16 max-md:border-b md:w-60 md:border-r" />
      <main className="flex-1 px-4 py-6 text-ink-soft md:px-10 md:py-8">Memeriksa sesi…</main>
    </div>
  );
}
