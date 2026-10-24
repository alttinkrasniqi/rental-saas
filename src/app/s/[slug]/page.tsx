import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingApp } from "./booking-app";
import { mergeSettings } from "@/lib/site";

export const dynamic = "force-dynamic";

async function getBusinessBySlug(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("id, name, phone, address, currency, slug")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export default async function PublicBookingPage({ params }: { params: { slug: string } }) {
  const admin = createAdminClient();
  const biz = await getBusinessBySlug(params.slug);
  if (!biz?.id) notFound();

  const [{ data: v }, { data: r }, { data: st }] = await Promise.all([
    admin
      .from("vehicles")
      .select(
        "id, make, model, year, color, fuel_type, transmission, seats, doors, daily_price_cents, status, photos, description"
      )
      .eq("business_id", biz.id)
      .eq("archived", false)
      .order("make", { ascending: true }),
    admin
      .from("rentals")
      .select("vehicle_id, pickup_at, return_at")
      .eq("business_id", biz.id)
      .in("status", ["ACTIVE", "RESERVED"]),
    admin.from("site_settings").select("data").eq("business_id", biz.id).maybeSingle(),
  ]);

  // NOTE: plate is intentionally NOT selected — it must not reach the public page.
  const cars = (v ?? []).map((c: any) => ({
    ...c,
    photos: Array.isArray(c.photos) ? c.photos : [],
  }));
  const bookings = (r ?? []).map((b: any) => ({
    vehicle_id: b.vehicle_id,
    pickup_at: b.pickup_at,
    return_at: b.return_at,
  }));
  const settings = mergeSettings(st?.data ?? {});

  return (
    <BookingApp
      slug={biz.slug as string}
      cars={cars}
      bookings={bookings}
      currency={biz.currency ?? "EUR"}
      businessName={biz.name ?? "Car rental"}
      phone={biz.phone ?? null}
      address={biz.address ?? null}
      settings={settings}
    />
  );
}
