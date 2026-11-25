"use client";

import { Search } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

function openSearch() {
  window.dispatchEvent(new CustomEvent("open-global-search"));
}

export function SearchTrigger({ variant = "field" }: { variant?: "field" | "icon" }) {
  const t = useT();
  if (variant === "icon") {
    return (
      <button
        onClick={openSearch}
        aria-label={t("Search")}
        className="flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
      >
        <Search className="h-5 w-5" />
      </button>
    );
  }
  return (
    <button
      onClick={openSearch}
      className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground hover:bg-muted"
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">{t("Search…")}</span>
      <kbd className="hidden rounded border border-border bg-white px-1.5 text-[10px] font-medium md:inline">⌘K</kbd>
    </button>
  );
}
