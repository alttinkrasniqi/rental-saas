"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { signup, type AuthState } from "../actions";
import { AuthShell, AuthSubmit } from "@/components/auth-shell";

const initial: AuthState = {};

export default function SignupPage() {
  const [state, formAction] = useFormState(signup, initial);

  return (
    <AuthShell title="Krijo llogarinë" subtitle="Fillo të menaxhosh biznesin tënd për pak minuta.">
      <form action={formAction}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="ti@biznesi.com" required />
        </div>
        <div className="field">
          <label htmlFor="password">Fjalëkalimi</label>
          <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Të paktën 6 karaktere" required />
          <p className="hint">Të paktën 6 karaktere.</p>
        </div>
        {state.error && <p className="err">{state.error}</p>}
        <AuthSubmit>Krijo llogarinë</AuthSubmit>
      </form>
      <p className="foot">
        Ke tashmë llogari?{" "}
        <Link href="/login">Kyçu</Link>
      </p>
    </AuthShell>
  );
}
