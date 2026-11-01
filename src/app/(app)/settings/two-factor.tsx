"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { enrollTwoFactor, verifyEnroll, disableTwoFactor } from "./actions";
import { useT } from "@/lib/i18n/provider";

export function TwoFactorSection({ enabled: initialEnabled }: { enabled: boolean }) {
  const t = useT();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [mode, setMode] = useState<"idle" | "enrolling">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const beginEnroll = () => {
    setErr(null);
    start(async () => {
      const r = await enrollTwoFactor();
      if (r.error) return setErr(r.error);
      setFactorId(r.factorId ?? null);
      setQr(r.qr ?? null);
      setSecret(r.secret ?? null);
      setMode("enrolling");
    });
  };

  const onVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!factorId) return;
    const code = String(new FormData(e.currentTarget).get("code") || "");
    setErr(null);
    start(async () => {
      const r = await verifyEnroll(factorId, code);
      if (r.error) return setErr(r.error);
      setEnabled(true);
      setMode("idle");
      setQr(null);
      setSecret(null);
      setFactorId(null);
    });
  };

  const onDisable = () => {
    if (!confirm(t("Turn off two-factor authentication?"))) return;
    setErr(null);
    start(async () => {
      const r = await disableTwoFactor();
      if (r.error) return setErr(r.error);
      setEnabled(false);
    });
  };

  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t("Two-factor authentication")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("Ask for a code from an authenticator app at login. Strongly recommended.")}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
          }`}
        >
          {enabled ? t("On") : t("Off")}
        </span>
      </div>

      {err && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}

      {mode === "idle" && (
        <div className="mt-3">
          {enabled ? (
            <button
              type="button"
              onClick={onDisable}
              disabled={pending}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {t("Turn off")}
            </button>
          ) : (
            <button
              type="button"
              onClick={beginEnroll}
              disabled={pending}
              className="rounded-md bg-[#A11E22] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#851519] disabled:opacity-50"
            >
              {t("Turn on")}
            </button>
          )}
        </div>
      )}

      {mode === "enrolling" && (
        <Card className="mt-3">
          <CardContent className="space-y-4 pt-5">
            <p className="text-sm text-muted-foreground">
              {t("1. Scan this code with Google Authenticator, Authy or similar.")}
            </p>
            {qr && (
              <div className="flex justify-center">
                {qr.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="QR" width={180} height={180} />
                ) : (
                  <div style={{ width: 180, height: 180 }} dangerouslySetInnerHTML={{ __html: qr }} />
                )}
              </div>
            )}
            {secret && (
              <p className="text-center text-xs text-muted-foreground">
                {t("Or enter this key manually:")}<br />
                <code className="mt-1 inline-block rounded bg-muted px-2 py-1 font-mono text-[13px] tracking-wider text-foreground">
                  {secret}
                </code>
              </p>
            )}
            <form onSubmit={onVerify} className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("2. Enter the 6-digit code it shows:")}</p>
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="______"
                required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg font-bold tracking-[6px]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-[#A11E22] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#851519] disabled:opacity-50"
                >
                  {t("Verify & turn on")}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("idle"); setErr(null); }}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-background"
                >
                  {t("Cancel")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
