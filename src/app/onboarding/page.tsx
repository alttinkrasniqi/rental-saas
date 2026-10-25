"use client";

import { useFormState } from "react-dom";
import { createBusiness, type OnboardingState } from "./actions";
import { AuthShell, AuthSubmit } from "@/components/auth-shell";

const initial: OnboardingState = {};

export default function OnboardingPage() {
  const [state, formAction] = useFormState(createBusiness, initial);

  return (
    <AuthShell
      title="Rregullo biznesin tënd"
      subtitle="Pak të dhëna për të filluar. Mund t'i ndryshosh kurdoherë te Cilësimet."
    >
      <form action={formAction}>
        <div className="field">
          <label htmlFor="name">Emri i biznesit</label>
          <input id="name" name="name" placeholder="p.sh. Prishtina Rent a Car" required />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefoni</label>
          <input id="phone" name="phone" placeholder="+383 4X XXX XXX" />
        </div>
        <div className="field">
          <label htmlFor="address">Adresa</label>
          <input id="address" name="address" placeholder="Rr. ..., Qyteti" />
        </div>
        <div className="field">
          <label htmlFor="email">Email i biznesit</label>
          <input id="email" name="email" type="email" placeholder="biznesi@email.com" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="field">
            <label htmlFor="currency">Valuta</label>
            <select id="currency" name="currency" defaultValue="EUR">
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="timezone">Zona kohore</label>
            <select id="timezone" name="timezone" defaultValue="Europe/Tirane">
              <option value="Europe/Tirane">Kosovë / Shqipëri</option>
              <option value="Europe/Zurich">Zvicër</option>
              <option value="Europe/Berlin">Gjermani</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
        {state.error && <p className="err">{state.error}</p>}
        <AuthSubmit>Vazhdo</AuthSubmit>
      </form>
    </AuthShell>
  );
}
