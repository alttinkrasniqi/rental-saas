import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBusiness, getCurrentUser } from "@/lib/business";
import { Landing } from "./landing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MenaxhoRentin — Menaxho rent-a-car biznesin tënd pa stres",
  description:
    "Rezervime online, kalendar i gjallë, klientë dhe të ardhura — të gjitha në një platformë të qetë e të thjeshtë për rent-a-car biznesin tënd.",
};

// Public marketing landing for logged-out visitors (menaxhorentin.com).
// Signed-in owners are sent straight into the app.
export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    const business = await getBusiness();
    redirect(business ? "/dashboard" : "/onboarding");
  }
  return <Landing />;
}
