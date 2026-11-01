import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireBusiness } from "@/lib/business";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Turns an array of flat objects into CSV text.
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /export               -> full JSON backup of the business's data
// GET /export?format=csv&table=rentals|clients|vehicles|payments
export async function GET(request: NextRequest) {
  let business;
  try {
    business = await requireBusiness();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createClient();
  const bid = business.id;
  const format = request.nextUrl.searchParams.get("format");
  const table = request.nextUrl.searchParams.get("table");

  if (format === "csv") {
    const allowed = ["rentals", "clients", "vehicles", "payments"];
    const t = allowed.includes(table || "") ? (table as string) : "rentals";
    const { data } = await supabase.from(t).select("*").eq("business_id", bid);
    await logAudit({ action: "data_exported", businessId: bid, metadata: { format: "csv", table: t } });
    return new NextResponse(toCsv((data as Record<string, unknown>[]) ?? []), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="menaxhorentin-${t}-${stamp()}.csv"`,
      },
    });
  }

  // Full JSON backup.
  const [vehicles, clients, rentals, payments, site] = await Promise.all([
    supabase.from("vehicles").select("*").eq("business_id", bid),
    supabase.from("clients").select("*").eq("business_id", bid),
    supabase.from("rentals").select("*").eq("business_id", bid),
    supabase.from("payments").select("*").eq("business_id", bid),
    supabase.from("site_settings").select("*").eq("business_id", bid).maybeSingle(),
  ]);

  const bundle = {
    exported_at: new Date().toISOString(),
    business,
    vehicles: vehicles.data ?? [],
    clients: clients.data ?? [],
    rentals: rentals.data ?? [],
    payments: payments.data ?? [],
    site_settings: site.data ?? null,
  };

  await logAudit({ action: "data_exported", businessId: bid, metadata: { format: "json" } });

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="menaxhorentin-backup-${stamp()}.json"`,
    },
  });
}
