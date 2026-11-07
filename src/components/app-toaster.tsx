"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { useT } from "@/lib/i18n/provider";

// Messages shown after a server action redirects with ?toast=<key>.
const MESSAGES: Record<string, string> = {
  saved: "Changes saved",
  created: "Created successfully",
  deleted: "Deleted successfully",
  restored: "Restored",
  archived: "Archived",
  payment: "Payment recorded",
  returned: "Marked as returned",
};

function Flash() {
  const t = useT();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = sp.get("toast");

  useEffect(() => {
    if (!key) return;
    const msg = MESSAGES[key];
    if (msg) toast.success(t(msg));
    // Strip the ?toast param so it doesn't re-fire on refresh/back.
    const next = new URLSearchParams(Array.from(sp.entries()));
    next.delete("toast");
    const qs = next.toString();
    router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pathname]);

  return null;
}

export function AppToaster() {
  return (
    <>
      <Toaster richColors position="top-center" toastOptions={{ style: { fontFamily: "inherit" } }} />
      <Suspense fallback={null}>
        <Flash />
      </Suspense>
    </>
  );
}
