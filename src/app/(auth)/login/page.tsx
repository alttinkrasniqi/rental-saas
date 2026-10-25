"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { login, type AuthState } from "../actions";
import { AuthShell, AuthSubmit } from "@/components/auth-shell";
import { VerifiedToast } from "@/components/verified-toast";

const initial: AuthState = {};

export default function LoginPage() {
  const [state, formAction] = useFormState(login, initial);

  return (
    <>
    <VerifiedToast />
    <AuthShell title="Mirë se u ktheve" subtitle="Kyçu për të menaxhuar biznesin tënd.">
      <form action={formAction}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="ti@biznesi.com" required />
        </div>
        <div className="field">
          <label htmlFor="password">Fjalëkalimi</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <Link href="/forgot-password" style={{ fontSize: 13, color: "#851519", fontWeight: 600 }}>
              Harrove fjalëkalimin?
            </Link>
          </div>
        </div>
        {state.error && <p className="err">{state.error}</p>}
        <AuthSubmit>Kyçu</AuthSubmit>
      </form>
      <p className="foot">
        Nuk ke llogari?{" "}
        <Link href="/signup">Krijo një falas</Link>
      </p>
    </AuthShell>
    </>
  );
}
