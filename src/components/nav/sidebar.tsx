"use client";

import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { logout } from "@/app/actions";
import { APP_NAME } from "@/lib/brand";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav/nav-links";
import { useT } from "@/lib/i18n/provider";

export function Sidebar({ businessName, badges }: { businessName: string; badges?: Record<string, number> }) {
  const t = useT();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-white md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Logo className="h-8 w-8" />
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </div>

      <div className="px-3">
        <Link
          href="/rentals/new"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t("New Rental")}
        </Link>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3">
        <NavLinks badges={badges} dense />
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 truncate px-3 text-sm font-medium">{businessName}</div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t("Log out")}
          </button>
        </form>
      </div>
    </aside>
  );
}
