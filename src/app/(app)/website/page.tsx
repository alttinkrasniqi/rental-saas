import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { Builder } from "./builder";
import { mergeSettings } from "@/lib/site";
import { publicBookingUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";

// Website builder for the signed-in owner's business (RLS-scoped reads).
export default async function WebsitePage() {
  const business = await getBusiness();
  const supabase = createClient();

  let cars: any[] = [];
  let settingsData: any = {};

  if (business?.id) {
    const [{ data: v }, { data: st }] = await Promise.all([
      supabase
        .from("vehicles")
        .select(
          "id, make, model, plate, year, color, fuel_type, transmission, seats, doors, daily_price_cents, description, photos"
        )
        .eq("business_id", business.id)
        .eq("archived", false)
        .order("make", { ascending: true }),
      supabase.from("site_settings").select("data").eq("business_id", business.id).maybeSingle(),
    ]);
    cars = (v ?? []).map((c: any) => ({ ...c, photos: Array.isArray(c.photos) ? c.photos : [] }));
    settingsData = st?.data ?? {};
  }

  const settings = mergeSettings(settingsData);
  const publicUrl = business?.slug ? publicBookingUrl(business.slug) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Website builder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Edit everything your customers see on the booking site — text, offers,
          reviews, contact details and car photos. Click “Save changes” and it goes
          live instantly.
        </p>
        {publicUrl && (
          <p className="mt-2 text-sm text-gray-600">
            Your public booking page:{" "}
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
              {publicUrl}
            </a>
          </p>
        )}
      </div>
      <Builder
        initialSettings={settings}
        initialContact={{
          phone: business?.phone || "",
          email: business?.email || "",
          address: business?.address || "",
        }}
        cars={cars}
      />
    </div>
  );
}
