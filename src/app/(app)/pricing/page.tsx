import { redirect } from "next/navigation";

// Pricing rules now live under Marketing.
export default function PricingPage() {
  redirect("/marketing");
}
