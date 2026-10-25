"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { requestPasswordReset, type ResetState } from "../actions";
import { AuthShell, AuthSubmit } from "@/components/auth-shell";

const initial: ResetState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(requestPasswordReset, initial);

  if (state.sent) {
    return (
      <AuthShell title="Kontrollo email-in" subtitle="Të dërguam një link për rivendosjen e fjalëkalimit.">
        <p style={{ fontSize: 14, color: "#5B524E", lineHeight: 1.7, marginBottom: 20 }}>
          Nëse ka një llogari me atë email, do të marrësh brenda pak çastesh një link për të vendosur
          fjalëkalim të ri. Hape linkun në <b style={{ color: "#2A2320" }}>të njëjtën pajisje</b> ku je tani.
        </p>
        <Link href="/login" style={{ fontSize: 14, color: "#851519", fontWeight: 700 }}>
          ← Kthehu te kyçja
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Rivendos fjalëkalimin" subtitle="Shkruaj email-in dhe të dërgojmë një link.">
      <form action={formAction}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="ti@biznesi.com" required />
        </div>
        {state.error && <p className="err">{state.error}</p>}
        <AuthSubmit>Dërgo linkun</AuthSubmit>
      </form>
      <p className="foot">
        <Link href="/login">← Kthehu te kyçja</Link>
      </p>
    </AuthShell>
  );
}
