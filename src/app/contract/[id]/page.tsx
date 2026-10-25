import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { formatMoney, formatDate, formatDateTime, rentalDays } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const CSS = `
.ct-root{background:#EEECEA;min-height:100vh;color:#1c1c1c;
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.ct-bar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:12px 18px;background:#fff;border-bottom:1px solid #e3e0dd}
.ct-print-btn{background:#A11E22;color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:700;font-size:14px;
  cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-family:inherit}
.ct-print-btn:hover{background:#851519}
.ct-back{color:#555;font-size:14px;text-decoration:none}
.ct-back:hover{color:#1c1c1c}
.sheet{background:#fff;max-width:820px;margin:24px auto;padding:46px 50px;
  box-shadow:0 12px 40px -16px rgba(0,0,0,.25);border-radius:4px}
.ct-head{text-align:center;border-bottom:2px solid #1c1c1c;padding-bottom:16px;margin-bottom:22px}
.ct-biz{font-size:21px;font-weight:800;letter-spacing:-.01em}
.ct-biz-sub{font-size:12.5px;color:#555;margin-top:4px}
.ct-title{font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-top:16px}
.ct-meta{display:flex;justify-content:center;flex-wrap:wrap;gap:6px 20px;font-size:12.5px;color:#555;margin-top:7px}
.ct-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:4px}
.ct-box{border:1px solid #d9d6d3;border-radius:8px;padding:14px 16px}
.ct-box h3{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:#8a2a22;margin:0 0 8px;font-weight:800}
.ct-kv{font-size:13px;line-height:1.75;margin:0}
.ct-kv .mut{color:#777}
.ct-sec{margin-top:24px}
.ct-sec > h2{font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:#1c1c1c;
  border-bottom:1px solid #e3e0dd;padding-bottom:6px;margin:0 0 12px;font-weight:800}
.ct-row{display:grid;grid-template-columns:repeat(2,1fr);gap:9px 28px;font-size:13px}
.ct-row .c span{color:#777}
.ct-row .c b{font-weight:700}
.ct-terms{font-size:12px;color:#333;line-height:1.65;padding-left:18px;margin:0}
.ct-terms li{margin-bottom:5px}
.ct-notes{border:1px dashed #cfccc9;border-radius:8px;min-height:62px;margin-top:4px}
.ct-sign{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:46px}
.ct-sign .who{font-size:12px;color:#777;margin-bottom:0}
.ct-sign .line{border-top:1px solid #1c1c1c;margin-top:54px;padding-top:6px;font-size:12px;color:#555;text-align:center}
.ct-foot{text-align:center;font-size:10.5px;color:#aaa;margin-top:30px}
@media print{
  .ct-root{background:#fff}
  .no-print{display:none !important}
  .sheet{box-shadow:none;margin:0;max-width:none;padding:0;border-radius:0}
  @page{size:A4;margin:16mm}
}
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

export default async function ContractPage({ params }: { params: { id: string } }) {
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
  const remaining = Math.max(0, (r.total_cents ?? 0) - (r.paid_cents ?? 0));
  const contractNo = String(r.id).slice(0, 8).toUpperCase();

  const dash = "—";
  const val = (x: any) => (x === null || x === undefined || x === "" ? dash : x);

  return (
    <div className="ct-root">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="ct-bar no-print">
        <Link href={`/rentals/${r.id}`} className="ct-back">← Kthehu te rezervimi</Link>
        <PrintButton />
      </div>

      <div className="sheet">
        <div className="ct-head">
          <div className="ct-biz">{business?.name || "Rent a Car"}</div>
          <div className="ct-biz-sub">
            {[business?.address, business?.phone, business?.email].filter(Boolean).join(" · ")}
          </div>
          <div className="ct-title">Kontratë Qiraje Automjeti</div>
          <div className="ct-meta">
            <span>Nr. {contractNo}</span>
            <span>Data: {formatDate(new Date())}</span>
          </div>
        </div>

        {/* Parties */}
        <div className="ct-grid2">
          <div className="ct-box">
            <h3>Qiradhënësi</h3>
            <p className="ct-kv">
              <b>{val(business?.name)}</b><br />
              {business?.address && <span className="mut">{business.address}<br /></span>}
              {business?.phone && <>Tel: {business.phone}<br /></>}
              {business?.email && <>Email: {business.email}</>}
            </p>
          </div>
          <div className="ct-box">
            <h3>Qiramarrësi</h3>
            <p className="ct-kv">
              <b>{val(c.full_name)}</b><br />
              {c.phone && <>Tel: {c.phone}<br /></>}
              {c.email && <>Email: {c.email}<br /></>}
              {c.id_number && <>Nr. personal/ID: {c.id_number}<br /></>}
              {c.license_number && <>Patentë: {c.license_number}<br /></>}
              {(c.address || c.country) && <span className="mut">{[c.address, c.country].filter(Boolean).join(", ")}</span>}
            </p>
          </div>
        </div>

        {/* Vehicle */}
        <div className="ct-sec">
          <h2>Automjeti</h2>
          <div className="ct-row">
            <div className="c"><span>Marka / Modeli:</span> <b>{val([v.make, v.model].filter(Boolean).join(" "))}</b></div>
            <div className="c"><span>Viti:</span> <b>{val(v.year)}</b></div>
            <div className="c"><span>Targa:</span> <b>{val(v.plate)}</b></div>
            <div className="c"><span>Ngjyra:</span> <b>{val(v.color)}</b></div>
            <div className="c"><span>Transmisioni:</span> <b>{val(v.transmission)}</b></div>
            <div className="c"><span>Km në nisje:</span> <b>{v.mileage != null ? `${v.mileage.toLocaleString()} km` : dash}</b></div>
          </div>
        </div>

        {/* Terms of this rental */}
        <div className="ct-sec">
          <h2>Kushtet e qirasë</h2>
          <div className="ct-row">
            <div className="c"><span>Marrja:</span> <b>{formatDateTime(r.pickup_at)}</b></div>
            <div className="c"><span>Kthimi:</span> <b>{openEnded ? "I hapur (caktohet në kthim)" : formatDateTime(r.return_at)}</b></div>
            <div className="c"><span>Numri i ditëve:</span> <b>{openEnded ? dash : days}</b></div>
            <div className="c"><span>Çmimi ditor:</span> <b>{formatMoney(r.daily_rate_cents ?? 0, currency)}</b></div>
            <div className="c"><span>Totali:</span> <b>{openEnded ? dash : formatMoney(r.total_cents ?? 0, currency)}</b></div>
            <div className="c"><span>Depozita:</span> <b>{formatMoney(r.deposit_cents ?? 0, currency)}</b></div>
            <div className="c"><span>Paguar:</span> <b>{formatMoney(r.paid_cents ?? 0, currency)}</b></div>
            <div className="c"><span>Mbetet:</span> <b>{openEnded ? dash : formatMoney(remaining, currency)}</b></div>
            <div className="c"><span>Mënyra e pagesës:</span> <b>{labelMethod(r.payment_method)}</b></div>
          </div>
        </div>

        {/* Standard terms */}
        <div className="ct-sec">
          <h2>Kushtet e përgjithshme</h2>
          <ol className="ct-terms">
            <li>Qiramarrësi deklaron se e ka marrë automjetin në gjendje të rregullt teknike dhe estetike.</li>
            <li>Automjeti drejtohet vetëm nga qiramarrësi ose persona të autorizuar me patentë valide.</li>
            <li>Ndalohet nënqiraja, përdorimi në gara, tërheqja e mjeteve të tjera, transporti i mallrave të paligjshme dhe drejtimi nën ndikimin e alkoolit apo substancave narkotike.</li>
            <li>Qiramarrësi mban përgjegjësi për gjobat e trafikut, dëmtimet dhe humbjet e shkaktuara gjatë periudhës së qirasë.</li>
            <li>Automjeti kthehet me të njëjtin nivel karburanti si në marrje.</li>
            <li>Vonesa në kthim ngarkohet me tarifë shtesë sipas çmimit ditor për çdo ditë vonesë.</li>
            <li>Depozita i kthehet qiramarrësit pas kontrollit të gjendjes së automjetit.</li>
            <li>Në rast aksidenti apo dëmtimi, qiramarrësi njofton menjëherë qiradhënësin dhe, kur është e nevojshme, policinë.</li>
          </ol>
        </div>

        {/* Handover notes (filled by hand live) */}
        <div className="ct-sec">
          <h2>Vërejtje / dëmtime ekzistuese</h2>
          <div className="ct-notes"></div>
        </div>

        {/* Signatures */}
        <div className="ct-sign">
          <div>
            <p className="who">Qiradhënësi</p>
            <div className="line">Nënshkrimi &amp; data</div>
          </div>
          <div>
            <p className="who">Qiramarrësi — {val(c.full_name)}</p>
            <div className="line">Nënshkrimi &amp; data</div>
          </div>
        </div>

        <p className="ct-foot">Kontratë nr. {contractNo} · Gjeneruar nga MenaxhoRentin</p>
      </div>
    </div>
  );
}
