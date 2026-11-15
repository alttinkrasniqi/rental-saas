import Link from "next/link";
import { Tags, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { PriceRules } from "../pricing/price-rules";
import { PromoCodes } from "./promo-codes";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

const TABS = [
  { key: "pricing", label: "Price rules", icon: Tags },
  { key: "discounts", label: "Discount codes", icon: Ticket },
] as const;

export default async function MarketingPage({ searchParams }: { searchParams: { tab?: string } }) {
  const t = getT();
  const tab = TABS.some((x) => x.key === searchParams.tab) ? searchParams.tab! : "pricing";
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  // Counts for both tab pills (cheap head counts), plus the active tab's data.
  const [{ count: ruleCount }, { count: codeCount }] = await Promise.all([
    supabase.from("price_rules").select("id", { count: "exact", head: true }),
    supabase.from("promo_codes").select("id", { count: "exact", head: true }),
  ]);
  const counts: Record<string, number> = { pricing: ruleCount ?? 0, discounts: codeCount ?? 0 };

  let cars: any[] = [];
  let rules: any[] = [];
  let codes: any[] = [];
  if (tab === "pricing") {
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("vehicles").select("id, make, model, plate").eq("archived", false).order("make", { ascending: true }),
      supabase.from("price_rules").select("*").order("start_date", { ascending: false }),
    ]);
    cars = c ?? [];
    rules = r ?? [];
  } else {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    codes = data ?? [];
  }

  return (
    <div>
      <PageHeader title={t("Marketing")} subtitle={t("Scheduled pricing and discount codes — in one place.")} />

      {/* Segmented control */}
      <div className="mb-6">
        <div className="inline-flex w-full gap-1 rounded-2xl border border-border/60 bg-muted/60 p-1 sm:w-auto">
          {TABS.map((x) => {
            const active = x.key === tab;
            const Icon = x.icon;
            const n = counts[x.key];
            return (
              <Link
                key={x.key}
                href={`/marketing?tab=${x.key}`}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:flex-none",
                  active
                    ? "bg-card text-foreground shadow-sm ring-1 ring-black/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                {t(x.label)}
                {n > 0 && (
                  <span
                    className={cn(
                      "ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                      active ? "bg-primary/10 text-primary" : "bg-foreground/10 text-muted-foreground"
                    )}
                  >
                    {n}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {tab === "pricing" ? (
        <PriceRules cars={cars} rules={rules} currency={currency} />
      ) : (
        <PromoCodes codes={codes} currency={currency} />
      )}
    </div>
  );
}
