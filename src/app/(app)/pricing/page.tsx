import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { PriceRules } from "./price-rules";
import { getT } from "@/lib/i18n/server";

export default async function PricingPage() {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();

  const [{ data: cars }, { data: rules }] = await Promise.all([
    supabase.from("vehicles").select("id, make, model, plate").eq("archived", false).order("make", { ascending: true }),
    supabase.from("price_rules").select("*").order("start_date", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title={t("Pricing rules")}
        subtitle={t("Schedule automatic price changes by date — a surcharge for a season, or a new price from a date onward.")}
      />
      <PriceRules cars={cars ?? []} rules={rules ?? []} currency={business?.currency ?? "EUR"} />
    </div>
  );
}
