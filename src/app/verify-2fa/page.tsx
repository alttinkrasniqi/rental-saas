"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyTwoFactor } from "./actions";
import { logout } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") || "").trim();
    setErr(null);
    start(async () => {
      const r = await verifyTwoFactor(code);
      if (r.error) return setErr(r.error);
      router.push("/dashboard");
    });
  };

  return (
    <AuthShell title="Verifikim në dy hapa" subtitle="Shkruaj kodin nga aplikacioni i autentikimit.">
      <form onSubmit={onVerify}>
        <p style={{ marginBottom: 16, fontSize: 14, color: "#5B524E", lineHeight: 1.6 }}>
          Hap aplikacionin tënd të autentikimit (Google Authenticator, Authy, etj.) dhe shkruaj kodin 6-shifror.
        </p>
        <div className="field">
          <label htmlFor="code">Kodi 6-shifror</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="______"
            required
            autoFocus
            style={{ textAlign: "center", letterSpacing: "6px", fontSize: "20px", fontWeight: 700 }}
          />
        </div>
        {err && <p className="err">{err}</p>}
        <button type="submit" className="submit" disabled={pending}>
          {pending && <span className="spin" aria-hidden="true" />}
          Verifiko &amp; vazhdo
        </button>
      </form>
      <form action={logout} style={{ marginTop: 4 }}>
        <button type="submit" style={{ background: "none", border: 0, color: "#8C827D", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
          ← Dil
        </button>
      </form>
    </AuthShell>
  );
}
