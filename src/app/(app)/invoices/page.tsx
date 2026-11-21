import Link from "next/link";
import { FileText, FileCheck, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { formatMoney, formatDate, toDate, remainingCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import { issueFromRegister } from "./actions";

export const dynamic = "force-dynamic";

const LIMIT = 200;

function invoiceLabel(r: any): string {
  if (r.invoice_no == null) return "PROFORMA";
  const year = new Date(r.invoice_issued_at ?? r.created_at ?? Date.now()).getFullYear();
  return `FAT-${year}-${String(r.invoice_no).padStart(4, "0")}`;
}

export default async function InvoicesPage({ searchParams }: { searchParams: { f?: string } }) {
  const t = getT();
  const business = await getBusiness();
  const currency = business?.currency ?? "EUR";
  const supabase = createClient();

  const { data } = await supabase
    .from("rentals")
    .select("id, invoice_no, invoice_issued_at, created_at, pickup_at, return_at, total_cents, paid_cents, open_ended, status, client:clients(full_name)")
    .neq("status", "CANCELLED");
  const all = (data ?? []) as any[];
  // Sort: issued first by number desc, then proformas by date desc.
  all.sort((a, b) => {
    const ai = a.invoice_no != null, bi = b.invoice_no != null;
    if (ai && bi) return b.invoice_no - a.invoice_no;
    if (ai !== bi) return ai ? -1 : 1;
    return toDate(b.created_at ?? b.pickup_at).getTime() - toDate(a.created_at ?? a.pickup_at).getTime();
  });

  const filter = ["proforma", "issued", "unpaid"].includes(searchParams.f ?? "") ? searchParams.f! : "all";
  let rows = all;
  if (filter === "proforma") rows = all.filter((r) => r.invoice_no == null);
  else if (filter === "issued") rows = all.filter((r) => r.invoice_no != null);
  else if (filter === "unpaid") rows = all.filter((r) => remainingCents(r) > 0);

  const issued = all.filter((r) => r.invoice_no != null);
  const billed = issued.reduce((s, r) => s + (r.total_cents ?? 0), 0);
  const collected = issued.reduce((s, r) => s + (r.paid_cents ?? 0), 0);
  const outstanding = issued.reduce((s, r) => s + remainingCents(r), 0);

  const chips = [
    { label: t("Issued"), value: String(issued.length), tone: "text-foreground" },
    { label: t("Billed"), value: formatMoney(billed, currency), tone: "text-foreground" },
    { label: t("Collected"), value: formatMoney(collected, currency), tone: "text-emerald-600" },
    { label: t("Outstanding"), value: formatMoney(outstanding, currency), tone: outstanding > 0 ? "text-rose-600" : "text-emerald-600" },
  ];
  const hrefFor = (f: string) => (f === "all" ? "/invoices" : `/invoices?f=${f}`);
  const shown = rows.slice(0, LIMIT);

  return (
    <div>
      <PageHeader title={t("Invoices")} subtitle={t("Every invoice and proforma in one register.")} />

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {chips.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
            <p className={`text-xl font-extrabold leading-none ${c.tone}`}>{c.value}</p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {[
          { k: "all", l: t("All") },
          { k: "issued", l: t("Issued") },
          { k: "proforma", l: t("Proforma") },
          { k: "unpaid", l: t("Unpaid") },
        ].map((x) => (
          <Link
            key={x.k}
            href={hrefFor(x.k)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              filter === x.k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {x.l}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">{t("Nothing here yet.")}</CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="space-y-2 p-3">
            {shown.map((r) => {
              const isIssued = r.invoice_no != null;
              const total = r.total_cents ?? 0;
              const paid = r.paid_cents ?? 0;
              const rem = remainingCents(r);
              const payBadge = total > 0 && paid >= total
                ? { cls: "bg-emerald-100 text-emerald-700", text: t("Paid") }
                : paid > 0
                ? { cls: "bg-amber-100 text-amber-700", text: t("Partial") }
                : { cls: "bg-rose-100 text-rose-700", text: t("Unpaid") };
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold", isIssued ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700")}>
                        {isIssued ? <FileCheck className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {invoiceLabel(r)}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", payBadge.cls)}>{payBadge.text}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold">{r.client?.full_name ?? t("Client")}</p>
                    <p className="text-xs text-muted-foreground">
                      {isIssued ? t("Issued {d}", { d: formatDate(r.invoice_issued_at) }) : formatDate(r.created_at ?? r.pickup_at)}
                      {" · "}{formatMoney(total, currency)}
                      {rem > 0 ? ` · ${t("owes {v}", { v: formatMoney(rem, currency) })}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isIssued && (
                      <form action={issueFromRegister}>
                        <input type="hidden" name="rental_id" value={r.id} />
                        <SubmitButton className="h-8 px-3 text-xs">{t("Issue")}</SubmitButton>
                      </form>
                    )}
                    <a
                      href={`/invoice/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-white px-3 text-xs font-semibold hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {t("Open")}
                    </a>
                  </div>
                </div>
              );
            })}
            {rows.length > LIMIT && (
              <p className="p-2 text-center text-xs text-muted-foreground">{t("Showing first {n}.", { n: LIMIT })}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
