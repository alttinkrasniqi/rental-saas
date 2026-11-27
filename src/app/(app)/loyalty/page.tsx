import Link from "next/link";
import { Crown, Clock, Phone, Plus, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { getT } from "@/lib/i18n/server";
import { formatMoney, formatDate } from "@/lib/format";
import { computeLoyalty, waNumber, DEFAULT_LOYALTY, type ClientLite, type RentalLite, type ClientStat } from "@/lib/loyalty";
import { saveLoyaltySettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const t = getT();
  const business = await getBusiness();
  const supabase = createClient();
  const biz = business?.name ?? "";
  const currency = (business as any)?.currency ?? "EUR";

  const settings = {
    minRentals: (business as any)?.loyalty_min_rentals ?? DEFAULT_LOYALTY.minRentals,
    winbackDays: (business as any)?.winback_days ?? DEFAULT_LOYALTY.winbackDays,
    discountPct: (business as any)?.loyalty_discount_pct ?? DEFAULT_LOYALTY.discountPct,
  };

  const [{ data: clientRows }, { data: rentalRows }] = await Promise.all([
    supabase.from("clients").select("id, full_name, phone, email").eq("deleted", false),
    supabase.from("rentals").select("client_id, status, paid_cents, total_cents, pickup_at, return_at, open_ended"),
  ]);

  const { vip, winback } = computeLoyalty(
    (clientRows ?? []) as ClientLite[],
    (rentalRows ?? []) as RentalLite[],
    settings,
    Date.now()
  );

  const vipMsg = (s: ClientStat) => `Përshëndetje ${s.name}! Si klient i vlerësuar i ${biz}, ke një zbritje ${settings.discountPct}% për rentën tënde të radhës. Na shkruaj për ta rezervuar — faleminderit që na zgjedh!`;
  const backMsg = (s: ClientStat) => `Përshëndetje ${s.name}! Ka kohë që s'je ndalur te ${biz}. Kthehu dhe përfito një ofertë të veçantë për rentën tënde të radhës 🚗`;
  const wa = (s: ClientStat, msg: string) => { const n = waNumber(s.phone); return n ? `https://wa.me/${n}?text=${encodeURIComponent(msg)}` : null; };

  return (
    <div>
      <PageHeader title={t("Loyalty & win-back")} subtitle={t("Reward your regulars and bring past customers back — from data you already have.")} />

      {/* settings */}
      <form action={saveLoyaltySettings} className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border border-border/70 bg-card p-4">
        <SettingNum name="min_rentals" label={t("Gold after N rentals")} value={settings.minRentals} />
        <SettingNum name="winback_days" label={t("Inactive after N days")} value={settings.winbackDays} />
        <SettingNum name="discount_pct" label={t("Loyalty discount %")} value={settings.discountPct} />
        <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("Save")}</button>
      </form>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* VIP */}
        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-semibold">{t("Gold customers")}</h2>
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{vip.length}</span>
          </div>
          {vip.length === 0 ? (
            <Empty text={t("No repeat customers yet — they'll show up here as rentals add up.")} />
          ) : (
            <div className="space-y-2.5">
              {vip.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t("{n} rentals", { n: s.count })} · {formatMoney(s.spentCents, currency)}
                        {s.phone ? <> · {s.phone}</> : null}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">-{settings.discountPct}%</span>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    {wa(s, vipMsg(s)) && <a href={wa(s, vipMsg(s))!} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"><MessageCircle className="h-3.5 w-3.5" /> {t("Offer on WhatsApp")}</a>}
                    <Link href={`/rentals/new?client=${s.id}`} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"><Plus className="h-3.5 w-3.5" /> {t("New rental")}</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Win-back */}
        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-sky-500" />
            <h2 className="text-sm font-semibold">{t("Bring them back")}</h2>
            <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">{winback.length}</span>
          </div>
          {winback.length === 0 ? (
            <Empty text={t("No one to win back right now — nice, your customers are active.")} />
          ) : (
            <div className="space-y-2.5">
              {winback.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t("Away {n} days", { n: s.daysSince ?? 0 })}
                        {s.lastAt ? <> · {t("last")} {formatDate(s.lastAt)}</> : null}
                        {" · "}{t("{n} rentals", { n: s.count })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    {wa(s, backMsg(s)) && <a href={wa(s, backMsg(s))!} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"><MessageCircle className="h-3.5 w-3.5" /> {t("Win back on WhatsApp")}</a>}
                    <Link href={`/rentals/new?client=${s.id}`} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"><Plus className="h-3.5 w-3.5" /> {t("New rental")}</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SettingNum({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input name={name} type="number" defaultValue={value} className="h-10 w-28 rounded-md border border-border bg-background px-3 text-sm" />
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
