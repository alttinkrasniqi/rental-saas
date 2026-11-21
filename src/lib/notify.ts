// Server-only email helpers (Resend). Every send goes through sendEmail(),
// which retries transient failures and writes a delivery-log row (email_log) so
// a message that never reaches a client is visible instead of silently lost.
// None of these ever throw — a failed email must not break the real action.
import { APP_NAME, APP_URL } from "./brand";
import { createAdminClient } from "./supabase/admin";

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

// The verified sending address (from MAIL_FROM), with a per-business display
// name so the client sees the business, not the platform.
function sendingAddress(): string {
  const m = /<([^>]+)>/.exec(MAIL_FROM);
  return m ? m[1] : MAIL_FROM;
}
function fromAs(name?: string): string {
  const n = (name || APP_NAME).replace(/[<>"]/g, "").trim();
  return `${n} <${sendingAddress()}>`;
}

// ---------------------------------------------------------------------------
// Central sender: retry + delivery log.
// ---------------------------------------------------------------------------

type SendResult = { ok: boolean; id?: string; error?: string };

const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Write one row to email_log. Best-effort: if the table is missing or the
// insert fails, we log to the server console and move on — logging must never
// break sending.
async function logEmail(row: {
  business_id: string | null;
  user_id: string | null;
  kind: string;
  recipient: string | null;
  subject: string;
  status: "sent" | "failed" | "skipped";
  provider_id?: string | null;
  error?: string | null;
  attempts: number;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("email_log").insert(row);
  } catch (e: any) {
    console.error("[notify] email_log insert failed", e?.message || e);
  }
}

async function sendEmail(opts: {
  kind: string;
  from: string;
  to?: string | null;
  subject: string;
  html: string;
  replyTo?: string | null;
  businessId?: string | null;
  userId?: string | null;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`[notify] RESEND_API_KEY not set — skipping ${opts.kind}`);
    return { ok: false, error: "no_api_key" };
  }
  if (!opts.to) {
    await logEmail({
      business_id: opts.businessId ?? null, user_id: opts.userId ?? null, kind: opts.kind,
      recipient: null, subject: opts.subject, status: "skipped", error: "no_recipient", attempts: 0,
    });
    return { ok: false, error: "no_recipient" };
  }

  const body: Record<string, unknown> = { from: opts.from, to: [opts.to], subject: opts.subject, html: opts.html };
  if (opts.replyTo) body.reply_to = opts.replyTo;

  let lastErr = "";
  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        let id: string | undefined;
        try { const j: any = await res.json(); id = j?.id; } catch {}
        await logEmail({
          business_id: opts.businessId ?? null, user_id: opts.userId ?? null, kind: opts.kind,
          recipient: opts.to, subject: opts.subject, status: "sent", provider_id: id ?? null, attempts: attempt,
        });
        return { ok: true, id };
      }
      lastStatus = res.status;
      lastErr = await res.text().catch(() => "");
      // Retry only on rate-limit or server-side errors; a 4xx won't fix itself.
      if (!(res.status === 429 || res.status >= 500)) break;
    } catch (e: any) {
      lastErr = e?.message || String(e); // network error — retryable
    }
    if (attempt < MAX_ATTEMPTS) await sleep(attempt * 800); // 800ms, then 1600ms
  }

  console.error(`[notify] ${opts.kind} failed after retries`, lastStatus, lastErr);
  await logEmail({
    business_id: opts.businessId ?? null, user_id: opts.userId ?? null, kind: opts.kind,
    recipient: opts.to, subject: opts.subject, status: "failed",
    error: `${lastStatus} ${lastErr}`.trim().slice(0, 500), attempts: MAX_ATTEMPTS,
  });
  return { ok: false, error: lastErr || `status_${lastStatus}` };
}

// ---------------------------------------------------------------------------
// Public notifiers — each builds the message, then delegates to sendEmail().
// ---------------------------------------------------------------------------

// Security alert: new country / new device at sign-in.
export async function notifySuspiciousLogin(info: {
  to: string;
  country?: string;
  city?: string;
  ip?: string;
  when?: Date;
  userId?: string | null;
}): Promise<void> {
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
  await sendEmail({ kind: "suspicious_login", from: MAIL_FROM, to: info.to, subject, html, userId: info.userId ?? null });
}

// Owner alert: a new online booking request came in.
export async function notifyNewBooking(info: {
  to?: string;
  carName?: string;
  plate?: string;
  from?: string | null;
  to_date?: string | null;
  customer?: string;
  phone?: string;
  businessId?: string | null;
}): Promise<void> {
  const recipient = info.to || FALLBACK_RECIPIENT;
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
  await sendEmail({ kind: "new_booking", from: MAIL_FROM, to: recipient, subject, html, businessId: info.businessId ?? null });
}

// Confirmation email to the CLIENT when a booking is confirmed.
export async function notifyBookingConfirmed(info: {
  to?: string;
  replyTo?: string;
  businessName?: string;
  businessPhone?: string | null;
  carName?: string;
  plate?: string | null;
  from?: string | null;
  to_date?: string | null;
  totalText?: string | null;
  openEnded?: boolean;
  businessId?: string | null;
}): Promise<void> {
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
  await sendEmail({
    kind: "booking_confirmed", from: fromAs(info.businessName), to: info.to, subject, html,
    replyTo: info.replyTo ?? null, businessId: info.businessId ?? null,
  });
}

// Reminder email to the CLIENT: pickup (day before), return (day due), overdue.
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
  businessId?: string | null;
}): Promise<void> {
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
  await sendEmail({
    kind: `reminder_${info.type}`, from: fromAs(info.businessName), to: info.to, subject, html,
    replyTo: info.replyTo ?? null, businessId: info.businessId ?? null,
  });
}
