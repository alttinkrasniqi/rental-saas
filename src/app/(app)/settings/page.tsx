import { redirect } from "next/navigation";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { publicBookingUrl } from "@/lib/brand";

export default async function SettingsPage() {
  const business = await getBusiness();
  if (!business) redirect("/onboarding");

  const publicUrl = business.slug ? publicBookingUrl(business.slug) : null;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your business profile" />
      {publicUrl && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Your public booking page</p>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-blue-600 hover:underline">
            {publicUrl}
          </a>
          <p className="mt-1 text-xs text-muted-foreground">Share this link with customers so they can reserve online.</p>
        </div>
      )}
      <SettingsForm business={business} />
    </div>
  );
}
