import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { formatDate } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const FUEL_LABELS = ["E", "¼", "½", "¾", "F"];

const CSS = `
.doc-root{background:#EEECEA;min-height:100vh;color:#1c1c1c;
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.doc-bar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:12px 18px;background:#fff;border-bottom:1px solid #e3e0dd}
.doc-print-btn{background:#B12A32;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:700;font-size:14px;
  cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-family:inherit}
.doc-print-btn:hover{background:#7A1E24}
.doc-back{color:#555;font-size:14px;text-decoration:none}.doc-back:hover{color:#1c1c1c}
.sheet{background:#fff;max-width:820px;margin:24px auto;padding:46px 50px;box-shadow:0 12px 40px -16px rgba(0,0,0,.25);border-radius:4px}
.pr-head{text-align:center;border-bottom:2px solid #1c1c1c;padding-bottom:16px;margin-bottom:18px}
.pr-biz{font-size:21px;font-weight:800;letter-spacing:-.01em}
.pr-biz-sub{font-size:12px;color:#555;margin-top:5px}
.pr-title{font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-top:16px}
.pr-meta{display:flex;justify-content:center;flex-wrap:wrap;gap:4px 20px;font-size:12.5px;color:#555;margin-top:7px}
.pr-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}
.pr-box{border:1px solid #d9d6d3;border-radius:8px;padding:14px 16px}
.pr-box h3{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:#8a2a22;margin:0 0 8px;font-weight:800}
.pr-kv{font-size:13px;line-height:1.75;margin:0}.pr-kv .mut{color:#777}
.pr-tbl{width:100%;border-collapse:collapse;margin-top:22px;font-size:13px}
.pr-tbl th{background:#f3efec;text-align:left;padding:9px 12px;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#555;border-bottom:1px solid #d9d6d3}
.pr-tbl th.col,.pr-tbl td.col{text-align:center;width:28%}
.pr-tbl td{padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top}
.pr-tbl td.col{text-align:center;font-weight:700}
.pr-tbl .lab{color:#555;font-weight:600}
.pr-note{border:1px dashed #cfccc9;border-radius:8px;min-height:54px;margin-top:4px;padding:10px 12px;font-size:12.5px;color:#333}
.pr-sec > h2{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#1c1c1c;border-bottom:1px solid #e3e0dd;padding-bottom:6px;margin:24px 0 10px;font-weight:800}
.pr-sign{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:20px}
.pr-sign .line{border-top:1px solid #1c1c1c;margin-top:44px;padding-top:6px;font-size:12px;color:#555;text-align:center}
.pr-foot{text-align:center;font-size:10.5px;color:#aaa;margin-top:28px}
@media print{.doc-root{background:#fff}.no-print{display:none !important}
  .sheet{box-shadow:none;margin:0;max-width:none;padding:0;border-radius:0}@page{size:A4;margin:16mm}}
`;

export default async function ProtocolPage({ params }: { params: { id: string } }) {
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

  const { data: condData } = await supabase
    .from("rental_conditions")
    .select("phase, fuel, odometer, notes")
    .eq("rental_id", r.id);
  const conds = (condData ?? []) as any[];
  const find = (phase: string) => conds.find((x) => x.phase === phase) ?? {};
  const pickup = find("pickup");
  const ret = find("return");

  const fuelLabel = (n: any) => (n == null || n < 0 || n > 4 ? "—" : FUEL_LABELS[n]);
  const km = (x: any) => (x.odometer != null ? `${x.odometer} km` : "—");
  const kmDriven = pickup.odometer != null && ret.odometer != null ? ret.odometer - pickup.odometer : null;

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

      <div className="sheet">
        <div className="pr-head">
          <div className="pr-biz">{business?.name || "Rent a Car"}</div>
          {business?.phone && <div className="pr-biz-sub">Tel: {business.phone}{business?.address ? ` · ${business.address}` : ""}</div>}
          <div className="pr-title">Protokoll i marrjes dhe dorëzimit</div>
          <div className="pr-meta">
            <span>Rezervimi #{r.id.slice(0, 8).toUpperCase()}</span>
            <span>{[v.make, v.model].filter(Boolean).join(" ")} {v.plate ? `· ${v.plate}` : ""}</span>
          </div>
        </div>

        <div className="pr-grid2">
          <div className="pr-box">
            <h3>Qiradhënësi</h3>
            <p className="pr-kv"><b>{business?.name || "—"}</b><br />
              {business?.phone && <><span className="mut">Tel:</span> {business.phone}</>}</p>
          </div>
          <div className="pr-box">
            <h3>Qiramarrësi</h3>
            <p className="pr-kv"><b>{c.full_name || "—"}</b><br />
              {c.phone && <><span className="mut">Tel:</span> {c.phone}<br /></>}
              {c.id_number && <><span className="mut">ID:</span> {c.id_number}</>}</p>
          </div>
        </div>

        <table className="pr-tbl">
          <thead>
            <tr>
              <th>Gjendja</th>
              <th className="col">Në marrje</th>
              <th className="col">Në dorëzim</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="lab">Data</td>
              <td className="col">{r.pickup_at ? formatDate(r.pickup_at) : "—"}</td>
              <td className="col">{r.returned_at ? formatDate(r.returned_at) : r.open_ended ? "—" : formatDate(r.return_at)}</td>
            </tr>
            <tr>
              <td className="lab">Karburanti</td>
              <td className="col">{fuelLabel(pickup.fuel)}</td>
              <td className="col">{fuelLabel(ret.fuel)}</td>
            </tr>
            <tr>
              <td className="lab">Kilometrazhi</td>
              <td className="col">{km(pickup)}</td>
              <td className="col">{km(ret)}</td>
            </tr>
          </tbody>
        </table>
        {kmDriven != null && (
          <p style={{ fontSize: 12.5, color: "#555", marginTop: 8 }}>Kilometra të bëra gjatë qirasë: <b>{kmDriven} km</b></p>
        )}

        <div className="pr-sec">
          <h2>Vërejtje / dëme në marrje</h2>
          <div className="pr-note">{pickup.notes || ""}</div>
        </div>
        <div className="pr-sec">
          <h2>Vërejtje / dëme në dorëzim</h2>
          <div className="pr-note">{ret.notes || ""}</div>
        </div>

        <div className="pr-sign">
          <div><div className="line">Qiradhënësi — nënshkrimi</div></div>
          <div><div className="line">Qiramarrësi — nënshkrimi</div></div>
        </div>

        <p className="pr-foot">Protokoll · {business?.name || "MenaxhoRentin"} · Gjeneruar nga MenaxhoRentin</p>
      </div>
    </div>
  );
}
