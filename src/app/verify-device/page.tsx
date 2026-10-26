"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendDeviceCode, verifyDeviceCode } from "./actions";
import { logout } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";

export default function VerifyDevicePage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const didInit = useRef(false);

  // Send a code on first load — unless the login step already sent one (?sent=1).
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    let alreadySent = false;
    try {
      alreadySent = new URLSearchParams(window.location.search).get("sent") === "1";
    } catch {}
    if (!alreadySent) start(async () => { await sendDeviceCode(); });
  }, []);

  const onVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") || "").trim();
    const remember = fd.get("remember") != null;
    setErr(null);
    setInfo(null);
    start(async () => {
      const r = await verifyDeviceCode(code, remember);
      if (r.error) return setErr(r.error);
      router.push("/dashboard");
    });
  };

  const onResend = () => {
    setErr(null);
    setInfo(null);
    start(async () => {
      const r = await sendDeviceCode();
      if (r.error) setErr(r.error);
      else setInfo("Kodi u dërgua. Kontrollo inboksin.");
    });
  };

  return (
    <AuthShell title="Verifiko pajisjen" subtitle="Po kyçesh nga një pajisje e re.">
      <form onSubmit={onVerify}>
        <p style={{ marginBottom: 16, fontSize: 14, color: "#5B524E", lineHeight: 1.6 }}>
          Për siguri, të dërguam një kod në email. Shkruaje më poshtë për të vazhduar.
        </p>
        <div className="field">
          <label htmlFor="code">Kodi nga emaili</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="______"
            required
            style={{ textAlign: "center", letterSpacing: "6px", fontSize: "20px", fontWeight: 700 }}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#5B524E", marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" name="remember" defaultChecked style={{ width: 16, height: 16, accentColor: "#A11E22" }} />
          Beso këtë pajisje për 30 ditë
        </label>
        {info && <p style={{ marginBottom: 12, fontSize: 13.5, color: "#1F6B63" }}>{info}</p>}
        {err && <p className="err">{err}</p>}
        <button type="submit" className="submit" disabled={pending}>
          {pending && <span className="spin" aria-hidden="true" />}
          Verifiko &amp; vazhdo
        </button>
        <p className="foot">
          Nuk e gjete kodin?{" "}
          <button type="button" onClick={onResend} disabled={pending} style={{ background: "none", border: 0, color: "#851519", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
            Dërgo përsëri
          </button>
        </p>
      </form>
      <form action={logout} style={{ marginTop: 4 }}>
        <button type="submit" style={{ background: "none", border: 0, color: "#8C827D", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
          ← Dil dhe përdor tjetër llogari
        </button>
      </form>
    </AuthShell>
  );
}
