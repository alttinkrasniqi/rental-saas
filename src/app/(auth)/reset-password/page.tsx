"use client";

import { useFormState } from "react-dom";
import { updatePassword, type AuthState } from "../actions";
import { AuthShell, AuthSubmit } from "@/components/auth-shell";

const initial: AuthState = {};

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState(updatePassword, initial);

  return (
    <AuthShell title="Vendos fjalëkalimin e ri" subtitle="Zgjidh një fjalëkalim të ri për llogarinë tënde.">
      <form action={formAction}>
        <div className="field">
          <label htmlFor="password">Fjalëkalimi i ri</label>
          <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Të paktën 6 karaktere" required />
        </div>
        <div className="field">
          <label htmlFor="password2">Përsërit fjalëkalimin</label>
          <input id="password2" name="password2" type="password" autoComplete="new-password" placeholder="Shkruaje përsëri" required />
        </div>
        {state.error && <p className="err">{state.error}</p>}
        <AuthSubmit>Ruaj fjalëkalimin</AuthSubmit>
      </form>
    </AuthShell>
  );
}
