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
