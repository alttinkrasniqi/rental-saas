import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { setLeadStatus, addManualLead, deleteLead } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new:       { label: "New",       cls: "bg-amber-100 text-amber-700" },
  contacted: { label: "Contacted", cls: "bg-blue-100 text-blue-700" },
  converted: { label: "Converted", cls: "bg-emerald-100 text-emerald-700" },
  closed:    { label: "Closed",    cls: "bg-slate-100 text-slate-600" },
};
const TABS = ["new", "contacted", "converted", "closed"] as const;

export default async function LeadsPage({ searchParams }: { searchParams: { status?: string } }) {
  const t = getT();
  await getBusiness();
  const supabase = createClient();

  const filter = searchParams.status && STATUS_META[searchParams.status] ? searchParams.status : null;
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (filter) q = q.eq("status", filter);
  const { data } = await q;
  const leads = (data ?? []) as any[];

  const { data: all } = await supabase.from("leads").select("status");
  const counts: Record<string, number> = { new: 0, contacted: 0, converted: 0, closed: 0 };
  for (const l of all ?? []) counts[l.status] = (counts[l.status] ?? 0) + 1;

  return (
    <div>
      <PageHeader title={t("Leads")} subtitle={t("Requests from customers who couldn't find a car — follow up and win them.")} />

      <form action={addManualLead} className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <div className="min-w-[140px] flex-1 space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">{t("Name")}</label>
          <input name="name" required placeholder={t("Customer name")} className={inp} />
        </div>
        <div className="w-44 space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">{t("Phone")}</label>
          <input name="phone" placeholder="+383 4X XXX XXX" className={inp} />
        </div>
        <div className="min-w-[140px] flex-1 space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">{t("Note")}</label>
          <input name="note" placeholder={t("What they wanted…")} className={inp} />
        </div>
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("Add lead")}</button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Tab href="/leads" label={t("All")} active={!filter} />
        {TABS.map((s) => (
          <Tab key={s} href={`/leads?status=${s}`} label={`${t(STATUS_META[s].label)} (${counts[s] ?? 0})`} active={filter === s} />
        ))}
      </div>

      {leads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("No leads yet. They'll appear here when a customer requests a car on your booking page.")}</p>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const meta = STATUS_META[l.status] ?? STATUS_META.new;
            const wa = l.phone ? `https://wa.me/${String(l.phone).replace(/[^0-9]/g, "")}` : null;
            const dates = l.pickup_date ? `${formatDate(l.pickup_date)}${l.return_date ? " → " + formatDate(l.return_date) : ""}` : null;
            const newRentalHref = l.pickup_date
              ? `/rentals/new?date=${l.pickup_date}${l.return_date ? `&return=${l.return_date}` : ""}`
              : "/rentals/new";
            return (
              <div key={l.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{l.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>{t(meta.label)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                      {l.phone && <span>{l.phone}</span>}
                      {dates && <span>{dates}</span>}
                      {l.car_type && <span>· {l.car_type}</span>}
                    </div>
                    {l.note && <p className="mt-1.5 text-[13px]">{l.note}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(l.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={btnGreen}>WhatsApp</a>}
                    <Link href={newRentalHref} className={btnPrimary}>{t("Create rental")}</Link>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                  {l.status !== "contacted" && <StatusBtn id={l.id} status="contacted" label={t("Mark contacted")} />}
                  {l.status !== "converted" && <StatusBtn id={l.id} status="converted" label={t("Converted")} />}
                  {l.status !== "closed" && <StatusBtn id={l.id} status="closed" label={t("Close")} />}
                  {l.status !== "new" && <StatusBtn id={l.id} status="new" label={t("Reopen")} />}
                  <form action={deleteLead} className="ml-auto">
                    <input type="hidden" name="id" value={l.id} />
                    <button className="rounded-md px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">{t("Delete")}</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inp = "h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-ring";
const btnGreen = "inline-flex h-8 items-center rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700";
const btnPrimary = "inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90";

function StatusBtn({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setLeadStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">{label}</button>
    </form>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`rounded-full border px-3 py-1 text-sm font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>
      {label}
    </Link>
  );
}
