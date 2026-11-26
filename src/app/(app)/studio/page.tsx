import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { getT } from "@/lib/i18n/server";
import { publicBookingUrl } from "@/lib/brand";
import { formatMoney } from "@/lib/format";
import { PostStudio } from "./post-studio";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("id, make, model, year, daily_price_cents, photos, transmission, seats, fuel_type")
    .eq("archived", false)
    .order("make", { ascending: true });

  const currency = (business as any)?.currency ?? "EUR";
  const cars = (data ?? []).map((v: any) => ({
    id: v.id as string,
    make: (v.make as string) ?? "",
    model: (v.model as string) ?? "",
    year: (v.year as number) ?? null,
    priceValue: formatMoney((v.daily_price_cents as number) ?? 0, currency),
    photos: Array.isArray(v.photos) ? (v.photos as string[]) : [],
    transmission: (v.transmission as string) ?? null,
    seats: (v.seats as number) ?? null,
    fuel: (v.fuel_type as string) ?? null,
  }));

  const bookingUrl = (business as any)?.slug ? publicBookingUrl((business as any).slug) : null;

  return (
    <div>
      <PageHeader
        title={t("Post Studio")}
        subtitle={t("Turn a car into a ready-to-post image for Instagram & Facebook.")}
      />
      <PostStudio
        business={{ name: business?.name ?? "", phone: (business as any)?.phone ?? null, bookingUrl }}
        cars={cars}
      />
    </div>
  );
}
