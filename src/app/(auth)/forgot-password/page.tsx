"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestPasswordReset, resetWithCode } from "../actions";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onSendCode = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const em = String(fd.get("email") || "").trim();
    setErr(null);
    start(async () => {
      const r = await requestPasswordReset(em);
      if (r.error) return setErr(r.error);
      setEmail(em);
      setStep("reset");
    });
  };

  const onReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") || "").trim();
    const pw = String(fd.get("password") || "");
    const pw2 = String(fd.get("password2") || "");
    setErr(null);
    setInfo(null);
    if (pw !== pw2) return setErr("Fjalëkalimet nuk përputhen.");
    start(async () => {
      const r = await resetWithCode(email, code, pw);
      if (r.error) return setErr(r.error);
      router.push("/dashboard");
    });
  };

  const onResend = () => {
    setErr(null);
    setInfo(null);
    start(async () => {
      const r = await requestPasswordReset(email);
      if (r.error) setErr(r.error);
      else setInfo("Kodi u dërgua përsëri. Kontrollo inboksin.");
    });
  };

  if (step === "reset") {
    return (
      <AuthShell title="Vendos fjalëkalimin e ri" subtitle="Shkruaj kodin nga email-i dhe fjalëkalimin e ri.">
        <form onSubmit={onReset}>
          <p style={{ marginBottom: 16, fontSize: 14, color: "#5B524E", lineHeight: 1.6 }}>
            Të dërguam një kod te <b style={{ color: "#2A2320" }}>{email}</b>. Shkruaje më poshtë dhe zgjidh një fjalëkalim të ri.
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
          <div className="field">
            <label htmlFor="password">Fjalëkalimi i ri</label>
            <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Të paktën 6 karaktere" required />
          </div>
          <div className="field">
            <label htmlFor="password2">Përsërit fjalëkalimin</label>
            <input id="password2" name="password2" type="password" autoComplete="new-password" placeholder="Shkruaje përsëri" required />
          </div>
          {info && <p style={{ marginBottom: 12, fontSize: 13.5, color: "#1F6B63" }}>{info}</p>}
          {err && <p className="err">{err}</p>}
          <button type="submit" className="submit" disabled={pending}>
            {pending && <span className="spin" aria-hidden="true" />}
            Ruaj fjalëkalimin
          </button>
          <p className="foot">
            Nuk e gjete kodin?{" "}
            <button type="button" onClick={onResend} disabled={pending} style={{ background: "none", border: 0, color: "#851519", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
              Dërgo përsëri
            </button>
            <br />
            <button type="button" onClick={() => { setStep("email"); setErr(null); setInfo(null); }} style={{ background: "none", border: 0, color: "#8C827D", cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginTop: 6 }}>
              ← Ndrysho email-in
            </button>
          </p>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Rivendos fjalëkalimin" subtitle="Shkruaj email-in dhe të dërgojmë një kod.">
      <form onSubmit={onSendCode}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="ti@biznesi.com" required />
        </div>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="submit" disabled={pending}>
          {pending && <span className="spin" aria-hidden="true" />}
          Dërgo kodin
        </button>
      </form>
      <p className="foot">
        <Link href="/login">← Kthehu te kyçja</Link>
      </p>
    </AuthShell>
  );
}
