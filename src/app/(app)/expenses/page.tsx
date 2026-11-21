import { Car as CarIcon, Trash2, Wallet, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { ExpenseForm } from "./expense-form";
import { deleteExpense } from "./actions";
import { EXPENSE_CATEGORIES, EXPENSE_METHODS, categoryLabel } from "./constants";

export const dynamic = "force-dynamic";

const SQ_MONTHS = ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"];

function methodLabel(v: string | null): string | null {
  if (!v) return null;
  return EXPENSE_METHODS.find((m) => m.value === v)?.label ?? v;
}

export default async function ExpensesPage({ searchParams }: { searchParams: { m?: string } }) {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthParam = searchParams.m ?? curMonth;
  const allTime = monthParam === "all";
  const month = allTime ? "" : /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : curMonth;

  const [{ data: vData }, { data: eData }] = await Promise.all([
    supabase.from("vehicles").select("id, make, model, plate").eq("archived", false).order("make"),
    supabase
      .from("expenses")
      .select("*, vehicle:vehicles(make, model, plate)")
      .order("expense_date", { ascending: false }),
  ]);
  const cars = (vData ?? []).map((v: any) => ({ id: v.id, label: `${v.make} ${v.model}${v.plate ? ` · ${v.plate}` : ""}` }));
  const all = (eData ?? []) as any[];
  const rows = allTime ? all : all.filter((e) => String(e.expense_date ?? "").startsWith(month));

  const total = rows.reduce((s, e) => s + (e.amount_cents ?? 0), 0);
  const cash = rows.filter((e) => e.method === "cash").reduce((s, e) => s + (e.amount_cents ?? 0), 0);
  const nonCash = total - cash;

  // By-category breakdown (desc).
  const byCat = EXPENSE_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
    sum: rows.filter((e) => e.category === c.value).reduce((s, e) => s + (e.amount_cents ?? 0), 0),
  })).filter((c) => c.sum > 0).sort((a, b) => b.sum - a.sum);
  const maxCat = Math.max(1, ...byCat.map((c) => c.sum));

  // Month options for the filter (last 6 months).
  const monthOpts = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { val, label: `${SQ_MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  });

  const periodLabel = allTime
    ? t("All time")
    : `${SQ_MONTHS[parseInt(month.slice(5, 7), 10) - 1]} ${month.slice(0, 4)}`;

  return (
    <div>
      <PageHeader title={t("Expenses")} subtitle={t("Track where the money goes — feeds per-car profit.")} />

      {/* Summary */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl border border-transparent bg-primary p-4 text-primary-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-primary-foreground/85">{t("Total")} · {periodLabel}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20"><Wallet className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-[22px] font-extrabold leading-none">{formatMoney(total, currency)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">{t("Cash")}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><Banknote className="h-4 w-4" /></span>
          </div>
          <p className="mt-3 text-[22px] font-extrabold leading-none">{formatMoney(cash, currency)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-[13px] font-medium text-muted-foreground">{t("Card / bank")}</span>
          <p className="mt-3 text-[22px] font-extrabold leading-none">{formatMoney(nonCash, currency)}</p>
        </div>
      </div>

      {/* Filter + add */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap items-center gap-1.5">
          {monthOpts.map((m) => (
            <button
              key={m.val}
              name="m"
              value={m.val}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                month === m.val && !allTime ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {m.label}
            </button>
          ))}
          <button
            name="m"
            value="all"
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              allTime ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {t("All time")}
          </button>
        </form>
        <ExpenseForm cars={cars} currency={currency} />
      </div>

      {byCat.length > 0 && (
        <Card className="mb-5 rounded-2xl">
          <div className="border-b border-border/60 px-5 py-3.5">
            <h3 className="text-sm font-semibold tracking-tight">{t("By category")}</h3>
          </div>
          <CardContent className="space-y-2.5 p-5">
            {byCat.map((c) => (
              <div key={c.value} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm">{t(c.label)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (c.sum / maxCat) * 100)}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-semibold">{formatMoney(c.sum, currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* List */}
      {rows.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">{t("No expenses in this period.")}</CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="space-y-2 p-3">
            {rows.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatMoney(e.amount_cents ?? 0, currency)}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t(categoryLabel(e.category))}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{formatDate(e.expense_date)}</span>
                    {methodLabel(e.method) && <span>{t(methodLabel(e.method)!)}</span>}
                    {e.vehicle && (
                      <span className="inline-flex items-center gap-1">
                        <CarIcon className="h-3.5 w-3.5" />
                        {e.vehicle.make} {e.vehicle.model}{e.vehicle.plate ? ` · ${e.vehicle.plate}` : ""}
                      </span>
                    )}
                    {e.vendor && <span>{e.vendor}</span>}
                  </div>
                  {e.notes && <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>}
                </div>
                <ConfirmButton
                  action={deleteExpense}
                  id={e.id}
                  message={t("Delete this expense?")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmButton>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
