import { redirect } from "next/navigation";
import { getBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MobileTopBar } from "@/components/nav/mobile-top-bar";
import { SupportWidget } from "@/components/support-widget";
import { AppToaster } from "@/components/app-toaster";
import { LocaleProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const business = await getBusiness();
  if (!business) redirect("/onboarding");
  const locale = getLocale();

  // Pending online booking requests → badge on the Rentals nav item.
  const supabase = createClient();
  const { count } = await supabase
    .from("rentals")
    .select("id", { count: "exact", head: true })
    .eq("source", "online")
    .eq("approved", false)
    .neq("status", "CANCELLED");
  const badges = { "/rentals": count ?? 0 };

  return (
    <LocaleProvider locale={locale}>
    <div className="min-h-screen">
      <Sidebar businessName={business.name} badges={badges} />
      <MobileTopBar businessName={business.name} badges={badges} />
      <main className="md:pl-64">
        <div className="w-full px-4 py-6 pb-28 md:px-8 md:pb-10">{children}</div>
      </main>
      <BottomNav badges={badges} />
      <SupportWidget />
      <AppToaster />
    </div>
    </LocaleProvider>
  );
}
