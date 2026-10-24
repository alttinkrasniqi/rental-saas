import { redirect } from "next/navigation";
import { getBusiness, getCurrentUser } from "@/lib/business";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await getBusiness();
  if (!business) redirect("/onboarding");

  redirect("/dashboard");
}
