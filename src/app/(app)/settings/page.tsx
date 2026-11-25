import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Globe, Languages, Download, ExternalLink, Tag, Star } from "lucide-react";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { DevicesSection } from "./devices-section";
import { TwoFactorSection } from "./two-factor";
import { getTrustedDevices, getMfaStatus } from "./actions";
import { publicBookingUrl } from "@/lib/brand";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitch } from "@/components/language-switch";
import { createClient } from "@/lib/supabase/server";
import { ExtrasSettings } from "./extras-settings";
import { ReviewSettings } from "./review-settings";
import type { ExtraDef } from "@/lib/extras";

const TONES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-blue-100 text-blue-600",
  violet: "bg-violet-100 text-violet-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  slate: "bg-slate-100 text-slate-600",
};

function SettingsCard({
  icon: Icon,
  tone,
  title,
  subtitle,
  right,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 p-5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children && <div className="border-t border-border/60 p-5">{children}</div>}
    </div>
  );
}

export default async function SettingsPage() {
  const t = getT();
  const business = await getBusiness();
  if (!business) redirect("/onboarding");

  const publicUrl = business.slug ? publicBookingUrl(business.slug) : null;
  const devices = await getTrustedDevices();
  const mfa = await getMfaStatus();

  const supabase = createClient();
  const { data: extrasData } = await supabase
    .from("rental_extras")
    .select("id, name, kind, unit_cents")
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: reviewRows } = await supabase.from("reviews").select("rating");
  const reviewCount = (reviewRows ?? []).length;
  const reviewAvg = reviewCount ? (reviewRows as any[]).reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviewCount : 0;
  const reviewLink = publicUrl ? `${publicUrl}/review` : null;

  return (
    <div>
      <PageHeader title={t("Settings")} subtitle={t("Your business profile")} />

      <div className="space-y-5">
        {publicUrl && (
          <SettingsCard
            icon={Globe}
            tone="blue"
            title={t("Your public booking page")}
            subtitle={t("Share this link with customers so they can reserve online.")}
          >
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-[13px] text-foreground">
                {publicUrl}
              </code>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" /> {t("Open")}
              </a>
            </div>
          </SettingsCard>
        )}

        <SettingsForm business={business} />

        <TwoFactorSection enabled={mfa.enabled} />

        <DevicesSection devices={devices} />

        <SettingsCard
          icon={Tag}
          tone="violet"
          title={t("Extras & fees")}
          subtitle={t("Optional charges you can add to any rental.")}
        >
          <ExtrasSettings extras={(extrasData ?? []) as ExtraDef[]} currency={business.currency ?? "EUR"} />
        </SettingsCard>

        <SettingsCard
          icon={Star}
          tone="amber"
          title={t("Reviews")}
          subtitle={t("Turn happy customers into Google reviews.")}
        >
          <ReviewSettings googleUrl={(business as any).google_review_url ?? null} reviewLink={reviewLink} avg={reviewAvg} count={reviewCount} />
        </SettingsCard>

        <SettingsCard
          icon={Languages}
          tone="amber"
          title={t("Language")}
          subtitle={t("Choose the language of the app.")}
        >
          <LanguageSwitch />
        </SettingsCard>

        <SettingsCard
          icon={Download}
          tone="slate"
          title={t("Export your data")}
          subtitle={t("Download a full backup, or individual tables as CSV for your accountant.")}
        >
          <div className="flex flex-wrap gap-2">
            <a
              href="/export"
              className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {t("Full backup (JSON)")}
            </a>
            <a href="/export?format=csv&table=rentals" className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted">
              {t("Rentals (CSV)")}
            </a>
            <a href="/export?format=csv&table=clients" className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted">
              {t("Clients (CSV)")}
            </a>
            <a href="/export?format=csv&table=vehicles" className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted">
              {t("Cars (CSV)")}
            </a>
            <a href="/export?format=csv&table=payments" className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold transition hover:bg-muted">
              {t("Payments (CSV)")}
            </a>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
