"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { revokeDevice, revokeAllDevices, type TrustedDevice } from "./actions";
import { useT } from "@/lib/i18n/provider";

function friendlyDevice(ua: string | null): string {
  if (!ua) return "Pajisje e panjohur";
  const os = /iPhone/.test(ua) ? "iPhone"
    : /iPad/.test(ua) ? "iPad"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : "";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "";
  return [browser, os].filter(Boolean).join(" · ") || "Pajisje";
}

function fmtDate(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function DevicesSection({ devices }: { devices: TrustedDevice[] }) {
  const t = useT();
  const [list, setList] = useState(devices);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const onRevoke = (id: string) => {
    setBusyId(id);
    start(async () => {
      const r = await revokeDevice(id);
      if (!r.error) setList((prev) => prev.filter((d) => d.id !== id));
      setBusyId(null);
    });
  };

  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-sm font-medium">{t("Trusted devices")}</p>
      <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
        {t("Browsers that can sign in without an email code. Remove any you don't recognize.")}
      </p>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No trusted devices yet.")}</p>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {list.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {friendlyDevice(d.label)}
                    {d.current && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {t("This device")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("Added")} {fmtDate(d.created_at)}
                    {d.expires_at ? ` · ${t("expires")} ${fmtDate(d.expires_at)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRevoke(d.id)}
                  disabled={pending && busyId === d.id}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  {t("Remove")}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <form action={revokeAllDevices} className="mt-3">
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-background"
        >
          {t("Log out of all devices")}
        </button>
      </form>
    </div>
  );
}
