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
        <PriceRules cars={cars} rules={rules} currency={currency} />
      ) : (
        <PromoCodes codes={codes} currency={currency} />
      )}
    </div>
  );
}
