"use client";

import { useState } from "react";
import { passwordStrength } from "@/lib/password";

const COLORS = ["#C94A4A", "#C94A4A", "#C08A2E", "#1F8A5B"]; // dobët, dobët, mesatar, fortë

export function PasswordField({
  id,
  name,
  label,
  placeholder = "Të paktën 8 karaktere",
  autoComplete = "new-password",
  meter = true,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  meter?: boolean;
  hint?: string;
}) {
  const [v, setV] = useState("");
  const s = v ? passwordStrength(v) : null;
  const color = s ? COLORS[s.score] : "#C94A4A";

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        required
      />
      {meter && s && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 999,
                  background: i < s.score ? color : "#E7DFDA",
                  transition: "background .2s",
                }}
              />
            ))}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12.5, fontWeight: 600, color }}>
            Forca: {s.label}
          </p>
        </div>
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
