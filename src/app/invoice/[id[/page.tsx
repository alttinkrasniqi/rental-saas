import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { formatMoney, formatDate, rentalDays } from "@/lib/format";
import { PrintButton } from "./print-button";
import { IssueButton } from "./issue-button";

export const dynamic = "force-dynamic";

const CSS = `
.inv-root{background:#EEECEA;min-height:100vh;color:#1c1c1c;
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.inv-bar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:12px 18px;background:#fff;border-bottom:1px solid #e3e0dd}
.inv-bar-right{display:flex;gap:8px;align-items:center}
.inv-print-btn,.inv-issue-btn{color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:700;font-size:14px;
  cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-family:inherit}
.inv-print-btn{background:#A11E22}.inv-print-btn:hover{background:#851519}
.inv-issue-btn{background:#1c1c1c}.inv-issue-btn:hover{background:#000}.inv-issue-btn:disabled{opacity:.6;cursor:default}
.inv-back{color:#555;font-size:14px;text-decoration:none}.inv-back:hover{color:#1c1c1c}
.sheet{background:#fff;max-width:820px;margin:24px auto;padding:46px 50px;
  box-shadow:0 12px 40px -16px rgba(0,0,0,.25);border-radius:4px}
.inv-top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #1c1c1c;padding-bottom:18px}
.inv-biz{font-size:21px;font-weight:800;letter-spacing:-.01em}
.inv-biz-sub{font-size:12px;color:#555;margin-top:5px;line-height:1.7}
.inv-title{text-align:right}
.inv-title h1{font-size:24px;font-weight:800;letter-spacing:.04em;margin:0}
.inv-title .no{font-size:14px;font-weight:700;color:#8a2a22;margin-top:4px}
.inv-title .dt{font-size:12.5px;color:#555;margin-top:4px}
.inv-proforma{display:inline-block;margin-top:6px;background:#fff6d6;border:1px solid #e9d27a;color:#8a6d13;
  font-size:11px;font-weight:800;letter-spacing:.06em;padding:3px 8px;border-radius:6px}
.inv-parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px}
.inv-box{border:1px solid #d9d6d3;border-radius:8px;padding:14px 16px}
.inv-box h3{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:#8a2a22;margin:0 0 8px;font-weight:800}
.inv-kv{font-size:13px;line-height:1.75;margin:0}
.inv-kv .mut{color:#777}
.inv-tbl{width:100%;border-collapse:collapse;margin-top:24px;font-size:13px}
.inv-tbl th{background:#f3efec;text-align:left;padding:9px 12px;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#555;border-bottom:1px solid #d9d6d3}
.inv-tbl th.num,.inv-tbl td.num{text-align:right}
.inv-tbl td{padding:11px 12px;border-bottom:1px solid #eee;vertical-align:top}
.inv-tot{margin-top:16px;margin-left:auto;width:300px;font-size:13px}
.inv-tot .r{display:flex;justify-content:space-between;padding:6px 0}
.inv-tot .r.grand{border-top:2px solid #1c1c1c;margin-top:4px;padding-top:10px;font-size:16px;font-weight:800}
.inv-tot .r .mut{color:#777}
.inv-pay{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:26px}
.inv-note{font-size:11.5px;color:#777;line-height:1.6;margin-top:22px;border-top:1px solid #eee;padding-top:12px}
.inv-sign{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:40px}
.inv-sign .line{border-top:1px solid #1c1c1c;margin-top:46px;padding-top:6px;font-size:12px;color:#555;text-align:center}
.inv-foot{text-align:center;font-size:10.5px;color:#aaa;margin-top:28px}
.inv-hint{background:#fff6d6;border:1px solid #e9d27a;color:#8a6d13;font-size:12.5px;border-radius:8px;padding:10px 14px;margin-top:16px}
@media print{.inv-root{background:#fff}.no-print{display:none !important}
  .sheet{box-shadow:none;margin:0;max-width:none;padding:0;border-radius:0}@page{size:A4;margin:16mm}}
`;

function labelMethod(m: string | null) {
  switch (m) {
    case "CASH": return "Para në dorë";
    case "CARD": return "Kartë";
    case "BANK_TRANSFER": return "Transfertë bankare";
    case "OTHER": return "Tjetër";
    default: return "—";
  }
}

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const business = await getBusiness();
  const supabase = createClient();

  const { data } = await supabase
    .from("rentals")
    .select("*, vehicle:vehicles(*), client:clients(*)")
    .eq("id", params.id)
    .maybeSingle();
  if (!data) notFound();

  const r = data as any;
  const v = r.vehicle || {};
  const c = r.client || {};
  const currency = business?.currency ?? "EUR";
  const openEnded = !!r.open_ended;
  const days = rentalDays(r.pickup_at, r.return_at);

  const vatRate = business?.vat_rate ?? 0;
  const gross = r.total_cents ?? 0;
  const net = vatRate > 0 ? Math.round(gross / (1 + vatRate / 100)) : gross;
  const vat = gross - net;
  const paid = r.paid_cents ?? 0;
  const remaining = Math.max(0, gross - paid);

  const issued = r.invoice_no != null;
  const issueDate = issued ? r.invoice_issued_at : new Date();
  const year = new Date(issueDate).getFullYear();
  const invNo = issued ? `FAT-${year}-${String(r.invoice_no).padStart(4, "0")}` : "PROFORMA";

  const dash = "—";
  const hasFiscal = !!(business?.fiscal_number || business?.business_no || business?.vat_number);

  const lineDesc = `Qira automjeti — ${[v.make, v.model].filter(Boolean).join(" ") || "Automjet"}${v.plate ? ` (${v.plate})` : ""}`;
  const period = `${formatDate(r.pickup_at)} – ${openEnded ? "i hapur" : formatDate(r.return_at)}`;
  const qty = openEnded ? 1 : Math.max(1, days);

  return (
    <div className="inv-root">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="inv-bar no-print">
        <Link href={`/rentals/${r.id}`} className="inv-back">← Kthehu te rezervimi</Link>
        <div className="inv-bar-right">
          {!issued && <IssueButton rentalId={r.id} />}
          <PrintButton />
        </div>
      </div>

      <div className="sheet">
        {!hasFiscal && (
          <div className="inv-hint no-print">
            Plotëso të dhënat fiskale të biznesit (numri fiskal, NUI, TVSH, IBAN) te <b>Cilësimet</b> që fatura të dalë e plotë.
          </div>
        )}

        <div className="inv-top">
          <div>
            <div className="inv-biz">{business?.name || "Rent a Car"}</div>
            <div className="inv-biz-sub">
              {business?.address && <>{business.address}<br /></>}
              {business?.phone && <>Tel: {business.phone} </>}
              {business?.email && <>· {business.email}</>}
              {(business?.fiscal_number || business?.business_no || business?.vat_number) && <br />}
              {business?.business_no && <>NUI: {business.business_no} </>}
              {business?.fiscal_number && <>· Nr. fiskal: {business.fiscal_number} </>}
              {business?.vat_number && <>· Nr. TVSH: {business.vat_number}</>}
            </div>
          </div>
          <div className="inv-title">
            <h1>FATURË</h1>
            <div className="no">{invNo}</div>
            <div className="dt">Data: {formatDate(issueDate)}</div>
            {!issued && <div className="inv-proforma">E PALËSHUAR</div>}
          </div>
        </div>

        <div className="inv-parties">
          <div className="inv-box">
            <h3>Shitësi</h3>
            <p className="inv-kv">
              <b>{business?.name || dash}</b><br />
              {business?.address && <span className="mut">{business.address}<br /></span>}
              {business?.business_no && <>NUI: {business.business_no}<br /></>}
              {business?.fiscal_number && <>Nr. fiskal: {business.fiscal_number}<br /></>}
              {business?.vat_number && <>Nr. TVSH: {business.vat_number}</>}
            </p>
          </div>
          <div className="inv-box">
            <h3>Blerësi</h3>
            <p className="inv-kv">
              <b>{c.full_name || dash}</b><br />
              {c.address && <span className="mut">{[c.address, c.country].filter(Boolean).join(", ")}<br /></span>}
              {c.phone && <>Tel: {c.phone}<br /></>}
              {c.email && <>Email: {c.email}<br /></>}
              {c.id_number && <>Nr. personal/ID: {c.id_number}</>}
            </p>
          </div>
        </div>

        <table className="inv-tbl">
          <thead>
            <tr>
              <th>Përshkrimi</th>
              <th className="num">Ditë</th>
              <th className="num">Çmimi ditor</th>
              <th className="num">Shuma</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {lineDesc}
                <br /><span style={{ color: "#777", fontSize: 12 }}>{period}</span>
              </td>
              <td className="num">{openEnded ? dash : qty}</td>
              <td className="num">{formatMoney(r.daily_rate_cents ?? 0, currency)}</td>
              <td className="num">{formatMoney(gross, currency)}</td>
            </tr>
          </tbody>
        </table>

        <div className="inv-tot">
          {vatRate > 0 && (
            <>
              <div className="r"><span className="mut">Nëntotali (pa TVSH)</span><span>{formatMoney(net, currency)}</span></div>
              <div className="r"><span className="mut">TVSH ({vatRate}%)</span><span>{formatMoney(vat, currency)}</span></div>
            </>
          )}
          <div className="r grand"><span>Totali</span><span>{formatMoney(gross, currency)}</span></div>
          <div className="r"><span className="mut">Paguar</span><span>{formatMoney(paid, currency)}</span></div>
          <div className="r"><span className="mut">Mbetet</span><span>{formatMoney(remaining, currency)}</span></div>
        </div>

        <div className="inv-pay">
          <div className="inv-box">
            <h3>Pagesa</h3>
            <p className="inv-kv">
              Mënyra: <b>{labelMethod(r.payment_method)}</b><br />
              {business?.bank_name && <>Banka: {business.bank_name}<br /></>}
              {business?.bank_iban && <>IBAN: {business.bank_iban}</>}
            </p>
          </div>
          <div className="inv-box">
            <h3>Shënim</h3>
            <p className="inv-kv mut">
              {vatRate > 0
                ? "Çmimet përfshijnë TVSH-në."
                : "Biznes jo i regjistruar në TVSH — pa TVSH."}
            </p>
          </div>
        </div>

        <div className="inv-sign">
          <div><div className="line">Shitësi — nënshkrimi &amp; vula</div></div>
          <div><div className="line">Blerësi — nënshkrimi</div></div>
        </div>

        <p className="inv-foot">{invNo} · Gjeneruar nga MenaxhoRentin</p>
      </div>
    </div>
  );
}
