"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Menu, X, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { logout } from "@/app/actions";
import { APP_NAME } from "@/lib/brand";

export function MobileTopBar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar (mobile only) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white px-4 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="h-4 w-4" />
          </div>
          <span className="font-semibold">{APP_NAME}</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Full menu drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="truncate font-semibold">{businessName}</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-3">
              <Link
                href="/rentals/new"
                onClick={() => setOpen(false)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> New Rental
              </Link>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border p-3">
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
