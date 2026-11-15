// Server-only helper: emails a business owner when a new online booking comes in.
// Logs the outcome to the server logs; never throws.
import { APP_NAME, APP_URL } from "./brand";

const FALLBACK_RECIPIENT = process.env.NOTIFY_EMAIL || "";
// Verify your own domain in Resend and set MAIL_FROM to use it; the resend.dev
// sender only delivers to the Resend account's own address.
const MAIL_FROM = process.env.MAIL_FROM || `${APP_NAME} <onboarding@resend.dev>`;

function esc(s?: string | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return esc(String(s));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Security alert: emails the account owner when a login looks suspicious
// (new country / new device). Best-effort — logs and returns on any problem.
export async function notifySuspiciousLogin(info: {
  to: string;
  country?: string;
  city?: string;
  ip?: string;
  when?: Date;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !info.to) return;

    const whereParts = [info.city, info.country].filter(Boolean).map((s) => esc(s!));
    const where = whereParts.length ? whereParts.join(", ") : "një vendndodhje e panjohur";
    const when = (info.when || new Date()).toLocaleString("sq-AL", { timeZone: "Europe/Tirane" });
    const subject = `Hyrje e re në llogarinë tënde — ${APP_NAME}`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
        <h2 style="margin:0 0 12px">Hyrje e re në llogarinë tënde</h2>
        <p style="margin:4px 0">U bë një përpjekje hyrjeje nga <b>${where}</b> më <b>${esc(when)}</b>${info.ip ? ` (IP: ${esc(info.ip)})` : ""}.</p>
        <p style="margin:12px 0">Për siguri, po kërkojmë një kod verifikimi për të vazhduar.</p>
        <p style="margin:12px 0"><b>Nëse ishe ti, injoroje këtë email.</b> Nëse jo, dikush mund ta ketë fjalëkalimin tënd — <b>ndërroje menjëherë</b>.</p>
      </div>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MAIL_FROM, to: [info.to], subject, html }),
    });
  } catch (e: any) {
    console.error("[notify] suspicious-login alert failed", e?.message || e);
  }
}

export async function notifyNewBooking(info: {
  to?: string;              // recipient (the business's email); falls back to NOTIFY_EMAIL
  carName?: string;
  plate?: string;
  from?: string | null;     // pickup date (ISO)
  to_date?: string | null;  // return date (ISO)
  customer?: string;
  phone?: string;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[notify] RESEND_API_KEY is not set — skipping email");
      return;
    }
    const recipient = info.to || FALLBACK_RECIPIENT;
    if (!recipient) {
      console.error("[notify] no recipient (business has no email and NOTIFY_EMAIL unset) — skipping");
      return;
    }

    const car = esc(info.carName || "a car");
    const plate = esc(info.plate || "");
    const carLine = plate ? `${car} (${plate})` : car;
    const subject = `New online booking — ${info.carName || "a car"}${info.plate ? ` (${info.plate})` : ""}`;
    const reviewBtn = APP_URL
      ? `<p style="margin:18px 0 0">
           <a href="${APP_URL}/requests"
              style="display:inline-block;background:#111;color:#fff;font-weight:bold;text-decoration:none;padding:11px 20px;border-radius:8px">
             Review booking →
           </a>
         </p>`
      : `<p style="margin:18px 0 0;color:#555">Open your dashboard → Requests to approve or decline.</p>`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.5">
        <h2 style="margin:0 0 12px">New online booking request</h2>
        <p style="margin:4px 0"><b>Car:</b> ${carLine}</p>
        <p style="margin:4px 0"><b>Dates:</b> ${fmt(info.from)} → ${fmt(info.to_date)}</p>
        ${info.customer ? `<p style="margin:4px 0"><b>Customer:</b> ${esc(info.customer)}</p>` : ""}
        ${info.phone ? `<p style="margin:4px 0"><b>Phone:</b> ${esc(info.phone)}</p>` : ""}
        ${reviewBtn}
      </div>`;

    console.log("[notify] sending booking email to", recipient);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MAIL_FROM, to: [recipient], subject, html }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) console.error("[notify] Resend error", res.status, text);
    else console.log("[notify] Resend accepted", res.status);
  } catch (e: any) {
    console.error("[notify] failed", e?.message || e);
  }
}

// The verified sending address (from MAIL_FROM), with a per-business display
// name so the client sees the business, not the platform. Reply-To is set to
// the business's own email elsewhere, so replies reach the business.
function sendingAddress(): string {
  const m = /<([^>]+)>/.exec(MAIL_FROM);
  return m ? m[1] : MAIL_FROM;
}
function fromAs(name?: string): string {
  const n = (name || APP_NAME).replace(/[<>"]/g, "").trim();
  return `${n} <${sendingAddress()}>`;
}

// Confirmation email to the CLIENT when a booking is confirmed (created by the
// owner, or an online request approved). Best-effort — never throws.
export async function notifyBookingConfirmed(info: {
  to?: string;              // client email
  replyTo?: string;         // business email (replies go here)
  businessName?: string;
  businessPhone?: string | null;
  carName?: string;
  plate?: string | null;
  from?: string | null;     // pickup ISO
  to_date?: string | null;  // return ISO
  totalText?: string | null;// formatted total, e.g. "€300.00"
  openEnded?: boolean;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !info.to) return;

    const biz = esc(info.businessName || APP_NAME);
    const car = esc(info.carName || "makina");
    const plate = esc(info.plate || "");
    const carLine = plate ? `${car} (${plate})` : car;
    const dates = info.openEnded ? `${fmt(info.from)} → pa afat` : `${fmt(info.from)} → ${fmt(info.to_date)}`;
    const subject = `Rezervimi u konfirmua — ${info.businessName || APP_NAME}`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
        <h2 style="margin:0 0 12px">Rezervimi u konfirmua ✅</h2>
        <p style="margin:4px 0">Përshëndetje,</p>
        <p style="margin:4px 0">Rezervimi juaj te <b>${biz}</b> është konfirmuar. Detajet:</p>
        <table style="margin:12px 0;border-collapse:collapse">
          <tr><td style="padding:3px 14px 3px 0;color:#555">Makina</td><td style="padding:3px 0"><b>${carLine}</b></td></tr>
          <tr><td style="padding:3px 14px 3px 0;color:#555">Data</td><td style="padding:3px 0"><b>${dates}</b></td></tr>
          ${info.totalText ? `<tr><td style="padding:3px 14px 3px 0;color:#555">Totali</td><td style="padding:3px 0"><b>${esc(info.totalText)}</b></td></tr>` : ""}
        </table>
        <p style="margin:12px 0">Faleminderit që zgjodhët <b>${biz}</b>!</p>
        ${info.businessPhone ? `<p style="margin:4px 0;color:#555">Për çdo pyetje mund të na kontaktoni në ${esc(info.businessPhone)}.</p>` : ""}
      </div>`;

    const body: Record<string, unknown> = { from: fromAs(info.businessName), to: [info.to], subject, html };
    if (info.replyTo) body.reply_to = info.replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("[notify] booking-confirmed error", res.status, await res.text().catch(() => ""));
  } catch (e: any) {
    console.error("[notify] booking-confirmed failed", e?.message || e);
  }
}

// Reminder email to the CLIENT: pickup (day before), return (day due), or
// overdue. Sent by the daily cron. Best-effort — never throws.
export async function notifyRentalReminder(info: {
  type: "pickup" | "return" | "overdue";
  to?: string;
  replyTo?: string;
  businessName?: string;
  businessPhone?: string | null;
  carName?: string;
  plate?: string | null;
  from?: string | null;
  to_date?: string | null;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !info.to) return;

    const biz = esc(info.businessName || APP_NAME);
    const car = esc(info.carName || "makina");
    const plate = esc(info.plate || "");
    const carLine = plate ? `${car} (${plate})` : car;

    let subject = "";
    let heading = "";
    let line = "";
    if (info.type === "pickup") {
      subject = `Kujtesë: marrja e makinës nesër — ${info.businessName || APP_NAME}`;
      heading = "Kujtesë për marrjen 🔑";
      line = `Nesër (${fmt(info.from)}) merrni <b>${carLine}</b> te <b>${biz}</b>.`;
    } else if (info.type === "return") {
      subject = `Kujtesë: kthimi i makinës sot — ${info.businessName || APP_NAME}`;
      heading = "Kujtesë për kthimin ⏰";
      line = `Sot (${fmt(info.to_date)}) duhet të ktheni <b>${carLine}</b> te <b>${biz}</b>.`;
    } else {
      subject = `Makina ka kaluar afatin e kthimit — ${info.businessName || APP_NAME}`;
      heading = "Kthimi ka vonesë";
      line = `<b>${carLine}</b> duhej kthyer më <b>${fmt(info.to_date)}</b>. Ju lutemi kthejeni sa më parë ose na kontaktoni.`;
    }

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111;line-height:1.6">
        <h2 style="margin:0 0 12px">${heading}</h2>
        <p style="margin:4px 0">Përshëndetje,</p>
        <p style="margin:8px 0">${line}</p>
        ${info.businessPhone ? `<p style="margin:10px 0;color:#555">Për çdo pyetje: ${esc(info.businessPhone)}.</p>` : ""}
        <p style="margin:12px 0;color:#555">Faleminderit, <b>${biz}</b></p>
      </div>`;

    const body: Record<string, unknown> = { from: fromAs(info.businessName), to: [info.to], subject, html };
    if (info.replyTo) body.reply_to = info.replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("[notify] reminder error", info.type, res.status, await res.text().catch(() => ""));
  } catch (e: any) {
    console.error("[notify] reminder failed", e?.message || e);
  }
}
