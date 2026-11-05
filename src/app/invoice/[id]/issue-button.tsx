"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCheck } from "lucide-react";
import { issueInvoice } from "./actions";

export function IssueButton({ rentalId }: { rentalId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="inv-issue-btn"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await issueInvoice(rentalId);
          router.refresh();
        })
      }
    >
      <FileCheck className="h-4 w-4" /> {pending ? "Duke lëshuar…" : "Lësho faturën"}
    </button>
  );
}
