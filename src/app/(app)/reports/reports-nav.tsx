"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, CarFront, Users, CalendarCheck, CreditCard, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/provider";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/reports", label: "Overview", icon: LayoutDashboard },
  { href: "/reports/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/reports/cars", label: "Cars", icon: CarFront },
  { href: "/reports/clients", label: "Clients", icon: Users },
  { href: "/reports/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/reports/payments", label: "Payments & debts", icon: CreditCard },
  { href: "/reports/maintenance", label: "Maintenance", icon: Wrench },
];

export function ReportsNav() {
  const t = useT();
  const path = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();

  return (
    <aside className="h-fit rounded-2xl border border-border bg-card p-2 shadow-sm lg:sticky lg:top-4">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {ITEMS.map((it) => {
          const active = path === it.href;
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href + (qs ? `?${qs}` : "")}
              className={cn(
                "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:shrink",
                active
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(it.label)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
