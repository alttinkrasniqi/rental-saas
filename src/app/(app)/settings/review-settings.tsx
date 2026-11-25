"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/lib/i18n/provider";
import { saveGoogleReview } from "./review-actions";

export function ReviewSettings({ googleUrl, reviewLink, avg, count }: { googleUrl: string | null; reviewLink: string | null; avg: number; count: number }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!reviewLink) return;
    try { await navigator.clipboard.writeText(reviewLink); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t("Collect Google reviews automatically: happy customers are sent to Google, unhappy ones leave private feedback you read here.")}
      </p>

      <form action={saveGoogleReview} className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">{t("Your Google review link")}</label>
        <div className="flex gap-2">
          <Input name="google_review_url" defaultValue={googleUrl ?? ""} placeholder="https://g.page/r/…/review" />
          <SubmitButton className="h-10 shrink-0">{t("Save")}</SubmitButton>
        </div>
        <p className="text-[11px] text-muted-foreground">{t("Find it in your Google Business profile → Ask for reviews → copy the link.")}</p>
      </form>

      {reviewLink && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">{t("Your review page (share this with customers)")}</label>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-[12px]">{reviewLink}</code>
            <button type="button" onClick={copy} className="h-9 shrink-0 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted">
              {copied ? t("Copied") : t("Copy")}
            </button>
            <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="h-9 shrink-0 rounded-md border border-border px-3 text-xs font-semibold leading-9 hover:bg-muted">
              {t("Open")}
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/60 pt-3 text-sm">
        <span className="text-muted-foreground">
          {count > 0 ? t("{avg}★ · {n} reviews", { avg: avg.toFixed(1), n: count }) : t("No reviews yet")}
        </span>
        <Link href="/reviews" className="font-semibold text-primary hover:underline">{t("View all")}</Link>
      </div>
    </div>
  );
}
