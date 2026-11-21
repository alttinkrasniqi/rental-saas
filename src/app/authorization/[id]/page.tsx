import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { formatDate } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const COUNTRIES: { code: string; sq: string; en: string }[] = [
  { code: "AL", sq: "Shqipëri", en: "Albania" },
  { code: "ME", sq: "Mal të Zi", en: "Montenegro" },
  { code: "MK", sq: "Maqedoni të Veriut", en: "North Macedonia" },
  { code: "XK", sq: "Kosovë", en: "Kosovo" },
];

const CSS = `
.doc-root{background:#EEECEA;min-height:100vh;color:#1c1c1c;
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.doc-bar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:12px 18px;background:#fff;border-bottom:1px solid #e3e0dd;flex-wrap:wrap}
.doc-print-btn{background:#B12A32;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:700;font-size:14px;
  cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-family:inherit}
.doc-print-btn:hover{background:#7A1E24}
.doc-back{color:#555;font-size:14px;text-decoration:none}.doc-back:hover{color:#1c1c1c}
.doc-opts{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;background:#fff;border-bottom:1px solid #e3e0dd;padding:12px 18px}
.doc-opts label{font-size:11px;font-weight:700;color:#555;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
.doc-opts input[type=date],.doc-opts input[type=text]{height:36px;border:1px solid #d9d6d3;border-radius:8px;padding:0 10px;font:inherit;font-size:13px}
.doc-chk{display:flex;gap:12px;align-items:center}
.doc-chk span{display:inline-flex;gap:5px;align-items:center;font-size:13px}
.doc-apply{height:36px;background:#1c1c1c;color:#fff;border:0;border-radius:8px;padding:0 16px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
.sheet{background:#fff;max-width:820px;margin:24px auto;padding:48px 54px;box-shadow:0 12px 40px -16px rgba(0,0,0,.25);border-radius:4px}
.au-head{text-align:center;border-bottom:2px solid #1c1c1c;padding-bottom:16px;margin-bottom:8px}
.au-biz{font-size:21px;font-weight:800;letter-spacing:-.01em}
.au-biz-sub{font-size:12px;color:#555;margin-top:5px;line-height:1.7}
.au-title{font-size:17px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;text-align:center;margin:26px 0 4px}
.au-title .en{display:block;font-size:12px;font-weight:700;color:#8a2a22;letter-spacing:.14em;margin-top:3px}
.au-p{font-size:13.5px;line-height:1.8;margin:16px 0}
.au-en{font-size:12px;line-height:1.7;color:#555;margin:14px 0;border-left:3px solid #e3e0dd;padding-left:14px}
.au-box{border:1px solid #d9d6d3;border-radius:8px;padding:14px 16px;margin-top:14px}
.au-box h3{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:#8a2a22;margin:0 0 8px;font-weight:800}
.au-kv{font-size:13px;line-height:1.85;margin:0}.au-kv b{font-weight:700}.au-kv .mut{color:#777}
.au-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
.au-sign{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:52px}
.au-sign .line{border-top:1px solid #1c1c1c;margin-top:50px;padding-top:6px;font-size:12px;color:#555;text-align:center}
.au-foot{text-align:center;font-size:10.5px;color:#aaa;margin-top:30px}
.au-warn{background:#fff6d6;border:1px solid #e9d27a;color:#8a6d13;font-size:12.5px;border-radius:8px;padding:10px 14px;margin-top:14px}
@media print{.doc-root{background:#fff}.no-print{display:none !important}
  .sheet{box-shadow:none;margin:0;max-width:none;padding:0;border-radius:0}@page{size:A4;margin:16mm}}
`;

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function AuthorizationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { to?: string; dest?: string | string[]; doc?: string; chassis?: string };
}) {
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

  // Editable bits (via the options bar). Sensible defaults from the rental.
  const dest = asArray(searchParams.dest);
  const selected = dest.length ? dest : ["AL"]; // default Albania — the common crossing
  const destNamesSq = COUNTRIES.filter((x) => selected.includes(x.code)).map((x) => x.sq).join(", ") || "—";
  const destNamesEn = COUNTRIES.filter((x) => selected.includes(x.code)).map((x) => x.en).join(", ") || "—";

  const defaultTo = !r.open_ended && r.return_at ? String(r.return_at).slice(0, 10) : "";
  const validTo = searchParams.to || defaultTo;
  const validFrom = String(r.pickup_at ?? "").slice(0, 10);
  const docNo = searchParams.doc ?? c.id_number ?? "";
  const chassis = searchParams.chassis ?? "";
  const today = new Date();

  const bizLine = [business?.address, business?.business_no && `NUI: ${business.business_no}`, business?.phone && `Tel: ${business.phone}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="doc-root">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="doc-bar no-print">
        <Link href={`/rentals/${r.id}`} className="doc-back">← Kthehu te rezervimi</Link>
        <PrintButton />
      </div>

      {/* Options (no JS needed — a GET form re-renders the letter). */}
      <form className="doc-opts no-print" method="get">
        <div>
          <label>Shtetet</label>
          <div className="doc-chk">
            {COUNTRIES.filter((x) => x.code !== "XK").map((x) => (
              <span key={x.code}>
                <input type="checkbox" name="dest" value={x.code} defaultChecked={selected.includes(x.code)} /> {x.sq}
              </span>
            ))}
          </div>
        </div>
        <div>
          <label>Vlen deri më</label>
          <input type="date" name="to" defaultValue={validTo} />
        </div>
        <div>
          <label>Dokument nr.</label>
          <input type="text" name="doc" defaultValue={docNo} placeholder="ID / pasaportë" />
        </div>
        <div>
          <label>Shasia (VIN)</label>
          <input type="text" name="chassis" defaultValue={chassis} placeholder="opsionale" />
        </div>
        <button className="doc-apply" type="submit">Rifresko</button>
      </form>

      <div className="sheet">
        <div className="au-head">
          <div className="au-biz">{business?.name || "Rent a Car"}</div>
          {bizLine && <div className="au-biz-sub">{bizLine}</div>}
        </div>

        <h1 className="au-title">
          Autorizim për dalje jashtë shtetit
          <span className="en">Vehicle Cross-Border Authorization</span>
        </h1>

        <p className="au-p">
          I nënshkruari, në cilësinë e pronarit/operatorit të kompanisë <b>{business?.name || "—"}</b>
          {business?.business_no ? <> (NUI {business.business_no})</> : null}, me këtë dokument <b>autorizoj</b> personin e
          mëposhtëm ta drejtojë automjetin e specifikuar jashtë territorit të Republikës së Kosovës, në: <b>{destNamesSq}</b>,
          për periudhën <b>{validFrom ? formatDate(validFrom) : "—"}</b>
          {validTo ? <> deri më <b>{formatDate(validTo)}</b></> : null}.
        </p>

        <div className="au-grid">
          <div className="au-box">
            <h3>Automjeti</h3>
            <p className="au-kv">
              <b>{[v.make, v.model].filter(Boolean).join(" ") || "—"}</b><br />
              <span className="mut">Targa:</span> <b>{v.plate || "—"}</b><br />
              {v.year ? <><span className="mut">Viti:</span> {v.year}<br /></> : null}
              {v.color ? <><span className="mut">Ngjyra:</span> {v.color}<br /></> : null}
              <span className="mut">Shasia (VIN):</span> {chassis || "—"}
            </p>
          </div>
          <div className="au-box">
            <h3>Personi i autorizuar</h3>
            <p className="au-kv">
              <b>{c.full_name || "—"}</b><br />
              <span className="mut">Dokument nr.:</span> {docNo || "—"}<br />
              {c.license_number ? <><span className="mut">Patentë nr.:</span> {c.license_number}<br /></> : null}
              {c.phone ? <><span className="mut">Tel:</span> {c.phone}</> : null}
            </p>
          </div>
        </div>

        <p className="au-en">
          The undersigned, as owner/operator of <b>{business?.name || "—"}</b>, hereby authorizes the person named above to
          drive the vehicle specified above outside the territory of the Republic of Kosovo, to: <b>{destNamesEn}</b>, for the
          period {validFrom ? formatDate(validFrom) : "—"}{validTo ? ` – ${formatDate(validTo)}` : ""}. This authorization is
          valid only for the stated vehicle and period.
        </p>

        <div className="au-warn no-print">
          Kontrollo shtetet, datën dhe numrin e shasisë lart, pastaj <b>Rifresko</b> para se të printosh.
        </div>

        <div className="au-sign">
          <div>
            <div className="line">Pronari / Operatori — nënshkrimi &amp; vula</div>
          </div>
          <div>
            <div className="line">Vendi dhe data: {formatDate(today)}</div>
          </div>
        </div>

        <p className="au-foot">Autorizim · {business?.name || "MenaxhoRentin"} · Gjeneruar nga MenaxhoRentin</p>
      </div>
    </div>
  );
}
