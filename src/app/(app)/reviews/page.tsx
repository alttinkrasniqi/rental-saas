import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "@/lib/business";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { deleteReview } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const t = getT();
  await getBusiness();
  const supabase = createClient();
  const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
  const reviews = (data ?? []) as any[];
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / count : 0;

  return (
    <div>
      <PageHeader title={t("Reviews")} subtitle={t("What your customers think — and private feedback to act on.")} />

      <div className="mb-5 flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="text-3xl font-bold">
          {count ? avg.toFixed(1) : "—"}<span className="text-base text-amber-500">★</span>
        </div>
        <div className="text-sm text-muted-foreground">{t("{n} reviews", { n: count })}</div>
      </div>

      {count === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("No reviews yet. Share your review link with customers after each rental.")}
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Stars n={r.rating ?? 0} />
                  {r.name && <span className="text-sm font-medium">{r.name}</span>}
                  {(r.rating ?? 0) <= 3 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t("Private feedback")}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                  <form action={deleteReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs font-medium text-rose-600 hover:underline">{t("Delete")}</button>
                  </form>
                </div>
              </div>
              {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  const v = Math.max(0, Math.min(5, n));
  return (
    <span className="text-amber-500">
      {"★".repeat(v)}<span className="text-muted-foreground/40">{"★".repeat(5 - v)}</span>
    </span>
  );
}
