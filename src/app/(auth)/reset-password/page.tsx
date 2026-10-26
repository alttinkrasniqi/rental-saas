"use client";

import { useFormState } from "react-dom";
import { updatePassword, type AuthState } from "../actions";
import { AuthShell, AuthSubmit } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";

const initial: AuthState = {};

export default function ResetPasswordPage() {
  const [state, formAction] = useFormState(updatePassword, initial);

  return (
    <AuthShell title="Vendos fjalëkalimin e ri" subtitle="Zgjidh një fjalëkalim të ri për llogarinë tënde.">
      <form action={formAction}>
        <PasswordField
          id="password"
          name="password"
          label="Fjalëkalimi i ri"
          hint="Të paktën 8 karaktere, me shkronja dhe numra."
        />
        <PasswordField
          id="password2"
          name="password2"
          label="Përsërit fjalëkalimin"
          placeholder="Shkruaje përsëri"
          meter={false}
        />
        {state.error && <p className="err">{state.error}</p>}
        <AuthSubmit>Ruaj fjalëkalimin</AuthSubmit>
      </form>
    </AuthShell>
  );
}
