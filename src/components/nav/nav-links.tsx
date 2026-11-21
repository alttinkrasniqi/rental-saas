"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_TREE, isGroup, type NavItem, type NavGroup } from "@/lib/nav";
import { useT } from "@/lib/i18n/provider";

// Shared nav body for the desktop sidebar and the mobile drawer. Renders the
// grouped NAV_TREE: plain items as links, groups as collapsible sections.
export function NavLinks({
  badges,
  onNavigate,
  dense,
}: {
  badges?: Record<string, number>;
  onNavigate?: () => void;
  dense?: boolean;
}) {
  const pathname = usePathname();
  const t = useT();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const pad = dense ? "py-2" : "py-2.5";

  return (
    <div className="space-y-1">
      {NAV_TREE.map((entry) =>
        isGroup(entry) ? (
          <GroupSection
            key={entry.label}
            group={entry}
            badges={badges}
            onNavigate={onNavigate}
            isActive={isActive}
            t={t}
            pad={pad}
          />
        ) : (
          <ItemLink key={entry.href} item={entry} active={isActive(entry.href)} badge={badges?.[entry.href]} onNavigate={onNavigate} t={t} pad={pad} />
        )
      )}
    </div>
  );
}

function ItemLink({
  item, active, badge, onNavigate, t, pad, indent,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
  t: (k: string) => string;
  pad: string;
  indent?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        pad,
        indent && "pl-9",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {t(item.label)}
      {badge ? (
        <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function GroupSection({
  group, badges, onNavigate, isActive, t, pad,
}: {
  group: NavGroup;
  badges?: Record<string, number>;
  onNavigate?: () => void;
  isActive: (href: string) => boolean;
  t: (k: string) => string;
  pad: string;
}) {
  const hasActive = group.items.some((i) => isActive(i.href));
  const [open, setOpen] = useState(false);
  const expanded = open || hasActive;
  const Icon = group.icon;
  const groupBadge = group.items.reduce((s, i) => s + (badges?.[i.href] ?? 0), 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
          pad,
          hasActive ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {t(group.label)}
        {groupBadge && !expanded ? (
          <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
            {groupBadge}
          </span>
        ) : null}
        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {group.items.map((i) => (
            <ItemLink key={i.href} item={i} active={isActive(i.href)} badge={badges?.[i.href]} onNavigate={onNavigate} t={t} pad={pad} indent />
          ))}
        </div>
      )}
    </div>
  );
}
