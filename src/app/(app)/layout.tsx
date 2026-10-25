import { redirect } from "next/navigation";
import { getBusiness } from "@/lib/business";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MobileTopBar } from "@/components/nav/mobile-top-bar";
import { SupportWidget } from "@/components/support-widget";
import { LocaleProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const business = await getBusiness();
  if (!business) redirect("/onboarding");
  const locale = getLocale();

  return (
    <LocaleProvider locale={locale}>
    <div className="min-h-screen">
      <Sidebar businessName={business.name} />
      <MobileTopBar businessName={business.name} />
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-8 md:pb-10">{children}</div>
      </main>
      <BottomNav />
      <SupportWidget />
    </div>
    </LocaleProvider>
  );
}
