"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

// Compact SQ / EN segmented toggle (used on the Settings page).
export function LanguageSwitch() {
  const router = useRouter();
  const locale = useLocale();
  const [pending, start] = useTransition();

  const pick = (l: "sq" | "en") =>
    start(async () => {
      await setLocale(l);
      router.refresh();
    });

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-white p-1">
      {(["sq", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          disabled={pending}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60",
            locale === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l === "sq" ? "Shqip" : "English"}
        </button>
      ))}
    </div>
  );
}
