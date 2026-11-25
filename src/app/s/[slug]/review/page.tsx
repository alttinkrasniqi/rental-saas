import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewApp } from "./review-app";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: { slug: string } }) {
  const admin = createAdminClient();
  const { data: biz } = await admin
    .from("businesses")
    .select("name, slug, google_review_url")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!biz?.slug) notFound();
  return <ReviewApp slug={biz.slug as string} businessName={biz.name ?? "Car rental"} googleUrl={(biz.google_review_url as string) ?? null} />;
}
