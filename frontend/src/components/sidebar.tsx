"use client";

import { Images, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABEL } from "@/lib/labels";
import { useUser } from "./user-context";
import { Wordmark } from "./wordmark";

// Menu hanya berisi modul yang sudah ada; modul berikutnya (Script, Landing page, Campaign, Lead)
// ditambahkan saat halamannya dibangun.
const NAV = [{ href: "/aset", label: "Aset", icon: Images }];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex shrink-0 flex-col border-line bg-surface md:min-h-screen md:w-60 md:border-r max-md:flex-row max-md:items-center max-md:justify-between max-md:border-b max-md:px-4 max-md:py-3">
      <div className="md:px-5 md:pt-6 md:pb-8">
        <Wordmark />
      </div>
      <nav className="flex gap-1 md:flex-1 md:flex-col md:px-3" aria-label="Menu utama">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium transition-colors ${
                active ? "bg-berry-wash text-berry-deep" : "text-ink-soft hover:bg-well hover:text-ink"
              }`}
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 md:border-t md:border-line md:px-5 md:py-4">
        <div className="min-w-0 max-md:hidden">
          <div className="truncate text-sm font-medium">{user.name || user.email}</div>
          <div className="text-[13px] text-ink-soft">{ROLE_LABEL[user.role]}</div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="ml-auto rounded-lg p-2 text-ink-soft transition-colors hover:bg-well hover:text-ink"
          title="Keluar"
        >
          <LogOut className="size-[18px]" aria-hidden />
          <span className="sr-only">Keluar</span>
        </button>
      </div>
    </aside>
  );
}
