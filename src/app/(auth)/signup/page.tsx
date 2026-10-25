"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signupStart, verifySignup, resendSignupCode } from "../actions";
import { AuthShell } from "@/components/auth-shell";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const em = String(fd.get("email") || "").trim();
    const pw = String(fd.get("password") || "");
    setErr(null);
    start(async () => {
      const r = await signupStart(em, pw);
      if (r.error) return setErr(r.error);
      if (r.verified) return router.push("/onboarding");
      setEmail(em);
      setStep("verify");
    });
  };

  const onVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") || "").trim();
    setErr(null);
    setInfo(null);
    start(async () => {
      const r = await verifySignup(email, code);
      if (r.error) return setErr(r.error);
      router.push("/onboarding?verified=1");
    });
  };

  const onResend = () => {
    setErr(null);
    setInfo(null);
    start(async () => {
      const r = await resendSignupCode(email);
      if (r.error) setErr(r.error);
      else setInfo("Kodi u dërgua përsëri. Kontrollo inboksin.");
    });
  };

  if (step === "verify") {
    return (
      <AuthShell title="Konfirmo email-in" subtitle="Dërguam një kod në email-in tënd.">
        <form onSubmit={onVerify}>
          <p style={{ marginBottom: 16, fontSize: 14, color: "#5B524E", lineHeight: 1.6 }}>
            Të dërguam një kod 6-shifror te <b style={{ color: "#2A2320" }}>{email}</b>. Shkruaje më poshtë për të vazhduar
            (ose kliko butonin te emaili).
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
          {info && <p style={{ marginBottom: 12, fontSize: 13.5, color: "#1F6B63" }}>{info}</p>}
          {err && <p className="err">{err}</p>}
          <button type="submit" className="submit" disabled={pending}>
            {pending && <span className="spin" aria-hidden="true" />}
            Konfirmo &amp; vazhdo
          </button>
          <p className="foot">
            Nuk e gjete kodin?{" "}
            <button type="button" onClick={onResend} disabled={pending} style={{ background: "none", border: 0, color: "#851519", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
              Dërgo përsëri
            </button>
            <br />
            <button type="button" onClick={() => { setStep("form"); setErr(null); setInfo(null); }} style={{ background: "none", border: 0, color: "#8C827D", cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginTop: 6 }}>
              ← Ndrysho email-in
            </button>
          </p>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Krijo llogarinë" subtitle="Fillo të menaxhosh biznesin tënd për pak minuta.">
      <form onSubmit={onSignup}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="ti@biznesi.com" required />
        </div>
        <div className="field">
          <label htmlFor="password">Fjalëkalimi</label>
          <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Të paktën 6 karaktere" required />
          <p className="hint">Të paktën 6 karaktere.</p>
        </div>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="submit" disabled={pending}>
          {pending && <span className="spin" aria-hidden="true" />}
          Krijo llogarinë
        </button>
      </form>
      <p className="foot">
        Ke tashmë llogari?{" "}
        <Link href="/login">Kyçu</Link>
      </p>
    </AuthShell>
  );
}
