import { createAdminClient } from "@/lib/supabase/admin";
import { SiteChrome } from "./site-chrome";

// Per-tenant public booking site shell (header/footer). The business is
// resolved from the URL slug; nothing here is business-specific in code.
async function getBiz(slug: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("businesses")
      .select("name, phone, email, address, slug")
      .eq("slug", slug)
      .maybeSingle();
    return data as {
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      slug: string;
    } | null;
  } catch {
    return null;
  }
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const biz = await getBiz(params.slug);
  return (
    <SiteChrome biz={biz} slug={params.slug}>
      {children}
    </SiteChrome>
  );
}
