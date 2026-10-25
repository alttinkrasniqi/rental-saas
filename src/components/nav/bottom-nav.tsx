"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_NAV_ITEMS } from "@/lib/nav";
import { useT } from "@/lib/i18n/provider";

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <>
      {/* Floating New Rental button (mobile) */}
      <Link
        href="/rentals/new"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
        aria-label="New rental"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-border bg-white md:hidden">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
