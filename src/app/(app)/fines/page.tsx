import Link from "next/link";
import { Gavel, Car as CarIcon, User as UserIcon, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { FineForm } from "./fine-form";
import { setFineStatus, deleteFine } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-amber-100 text-amber-700" },
  billed: { label: "Billed", cls: "bg-blue-100 text-blue-700" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-700" },
  waived: { label: "Waived", cls: "bg-slate-100 text-slate-600" },
};
const NEXT_STATUSES = ["new", "billed", "paid", "waived"] as const;

export default async function FinesPage({ searchParams }: { searchParams: { f?: string } }) {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  const [{ data: vData }, { data: fData }] = await Promise.all([
    supabase.from("vehicles").select("id, make, model, plate").eq("archived", false).order("make"),
    supabase
      .from("traffic_fines")
      .select("*, vehicle:vehicles(make, model, plate), client:clients(id, full_name)")
      .order("created_at", { ascending: false }),
  ]);
  const cars = (vData ?? []).map((v: any) => ({ id: v.id, label: `${v.make} ${v.model}${v.plate ? ` · ${v.plate}` : ""}` }));
  const all = (fData ?? []) as any[];

  const filter = ["new", "billed", "paid", "waived"].includes(searchParams.f ?? "") ? searchParams.f! : "all";
  const fines = filter === "all" ? all : all.filter((f) => f.status === filter);

  const unbilled = all.filter((f) => f.status === "new");
  const outstanding = all.filter((f) => f.status === "new" || f.status === "billed").reduce((s, f) => s + (f.amount_cents ?? 0), 0);
  const recovered = all.filter((f) => f.status === "paid").reduce((s, f) => s + (f.amount_cents ?? 0), 0);

  const chips: { key: string; label: string; value: string; tone: string }[] = [
    { key: "all", label: t("All fines"), value: String(all.length), tone: "text-foreground" },
    { key: "new", label: t("Unbilled"), value: String(unbilled.length), tone: "text-amber-600" },
    { key: "outstanding", label: t("To recover"), value: formatMoney(outstanding, currency), tone: "text-rose-600" },
    { key: "recovered", label: t("Recovered"), value: formatMoney(recovered, currency), tone: "text-emerald-600" },
  ];

  const hrefFor = (f: string) => (f === "all" ? "/fines" : `/fines?f=${f}`);

  return (
    <div>
      <PageHeader title={t("Traffic fines")} subtitle={t("Record a ticket and bill it to the right client.")} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
          {chips.map((c) => (
            <div key={c.key} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
              <p className={`text-xl font-extrabold leading-none ${c.tone}`}>{c.value}</p>
              <p className="mt-1.5 text-xs font-medium text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <FineForm cars={cars} currency={currency} />
      </div>

      {/* Filter tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["all", "new", "billed", "paid", "waived"].map((f) => (
          <Link
            key={f}
            href={hrefFor(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {f === "all" ? t("All") : t(STATUS_META[f].label)}
          </Link>
        ))}
      </div>

      {fines.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">{t("No fines here yet.")}</CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="space-y-2 p-3">
            {fines.map((f) => {
              const meta = STATUS_META[f.status] ?? STATUS_META.new;
              return (
                <div key={f.id} className="rounded-xl border border-border/70 p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatMoney(f.amount_cents ?? 0, currency)}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.cls)}>{t(meta.label)}</span>
                        {f.reference && <span className="font-mono text-[11px] text-muted-foreground">#{f.reference}</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(f.fine_date)}
                        {f.location ? ` · ${f.location}` : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <CarIcon className="h-3.5 w-3.5" />
                          {f.vehicle ? `${f.vehicle.make} ${f.vehicle.model}${f.vehicle.plate ? ` · ${f.vehicle.plate}` : ""}` : t("Unknown car")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {f.client ? (
                            <Link href={`/clients/${f.client.id}`} className="font-medium text-primary hover:underline">{f.client.full_name}</Link>
                          ) : (
                            <span className="text-muted-foreground">{t("No match — pick manually")}</span>
                          )}
                        </span>
                        {f.rental_id && (
                          <Link href={`/rentals/${f.rental_id}`} className="text-primary hover:underline">{t("View rental")}</Link>
                        )}
                      </div>
                      {f.notes && <p className="mt-1.5 text-xs text-muted-foreground">{f.notes}</p>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Status change: owner picks + saves (no JS needed). */}
                      <form action={setFineStatus} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={f.id} />
                        <select
                          name="status"
                          defaultValue={f.status}
                          className="h-8 rounded-md border border-input bg-white px-2 text-xs"
                        >
                          {NEXT_STATUSES.map((s) => (
                            <option key={s} value={s}>{t(STATUS_META[s].label)}</option>
                          ))}
                        </select>
                        <button type="submit" className="h-8 rounded-md border border-input bg-white px-2.5 text-xs font-semibold hover:bg-muted">
                          {t("Save")}
                        </button>
                      </form>
                      <ConfirmButton
                        action={deleteFine}
                        id={f.id}
                        message={t("Delete this fine?")}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ConfirmButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
