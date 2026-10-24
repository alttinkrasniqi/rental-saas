import { redirect } from "next/navigation";
import { getBusiness } from "@/lib/business";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { MobileTopBar } from "@/components/nav/mobile-top-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const business = await getBusiness();
  if (!business) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <Sidebar businessName={business.name} />
      <MobileTopBar businessName={business.name} />
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 md:px-8 md:pb-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
