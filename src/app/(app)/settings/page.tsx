import { redirect } from "next/navigation";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { DevicesSection } from "./devices-section";
import { TwoFactorSection } from "./two-factor";
import { getTrustedDevices, getMfaStatus } from "./actions";
import { publicBookingUrl } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitch } from "@/components/language-switch";

export default async function SettingsPage() {
  const t = getT();
  const business = await getBusiness();
  if (!business) redirect("/onboarding");

  const publicUrl = business.slug ? publicBookingUrl(business.slug) : null;
  const devices = await getTrustedDevices();
  const mfa = await getMfaStatus();

  return (
    <div>
      <PageHeader title={t("Settings")} subtitle={t("Your business profile")} />
      {publicUrl && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium">{t("Your public booking page")}</p>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-blue-600 hover:underline">
            {publicUrl}
          </a>
          <p className="mt-1 text-xs text-muted-foreground">{t("Share this link with customers so they can reserve online.")}</p>
        </div>
      )}
      <SettingsForm business={business} />

      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">{t("Language")}</p>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{t("Choose the language of the app.")}</p>
        <LanguageSwitch />
      </div>

      <TwoFactorSection enabled={mfa.enabled} />

      <DevicesSection devices={devices} />

      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">{t("Export your data")}</p>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
          {t("Download a full backup, or individual tables as CSV for your accountant.")}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/export"
            className="rounded-md bg-[#A11E22] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#851519]"
          >
            {t("Full backup (JSON)")}
          </a>
          <a href="/export?format=csv&table=rentals" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-background">
            {t("Rentals (CSV)")}
          </a>
          <a href="/export?format=csv&table=clients" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-background">
            {t("Clients (CSV)")}
          </a>
          <a href="/export?format=csv&table=vehicles" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-background">
            {t("Cars (CSV)")}
          </a>
          <a href="/export?format=csv&table=payments" className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-background">
            {t("Payments (CSV)")}
          </a>
        </div>
      </div>
    </div>
  );
}
