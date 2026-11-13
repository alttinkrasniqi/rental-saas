import Link from "next/link";
import { Tags, Ticket, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { PriceRules } from "../pricing/price-rules";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

const TABS = [
  { key: "pricing", label: "Price rules", icon: Tags },
  { key: "discounts", label: "Discount codes", icon: Ticket },
  { key: "promotions", label: "Promotions", icon: Sparkles },
] as const;

export default async function MarketingPage({ searchParams }: { searchParams: { tab?: string } }) {
  const t = getT();
  const tab = TABS.some((x) => x.key === searchParams.tab) ? searchParams.tab! : "pricing";
  const business = await getBusiness();
  const supabase = createClient();

  let cars: any[] = [];
  let rules: any[] = [];
  if (tab === "pricing") {
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("vehicles").select("id, make, model, plate").eq("archived", false).order("make", { ascending: true }),
      supabase.from("price_rules").select("*").order("start_date", { ascending: false }),
    ]);
    cars = c ?? [];
    rules = r ?? [];
  }

  return (
    <div>
      <PageHeader title={t("Marketing")} subtitle={t("Pricing rules, discount codes and promotions — in one place.")} />

      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex gap-0.5 rounded-lg border border-input bg-card p-1 shadow-sm">
          {TABS.map((x) => {
            const active = x.key === tab;
            const Icon = x.icon;
            return (
              <Link
                key={x.key}
                href={`/marketing?tab=${x.key}`}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" /> {t(x.label)}
              </Link>
            );
          })}
        </div>
      </div>

      {tab === "pricing" ? (
        <PriceRules cars={cars} rules={rules} currency={business?.currency ?? "EUR"} />
      ) : (
        <div className="rounded-xl border border-dashed border-input bg-muted/30 p-10 text-center">
          <p className="text-sm font-semibold">{t("Coming soon")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("Discount codes, flash sales and promotions for loyal customers land here next.")}
          </p>
        </div>
      )}
    </div>
  );
}
