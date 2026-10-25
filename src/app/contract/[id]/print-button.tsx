"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="ct-print-btn" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Printo / Ruaj si PDF
    </button>
  );
}
