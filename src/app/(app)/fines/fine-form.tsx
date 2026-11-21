"use client";

import { useState } from "react";
import { Plus, Gavel } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { addFine } from "./actions";

type CarOption = { id: string; label: string };

export function FineForm({ cars, currency }: { cars: CarOption[]; currency: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("Add fine")}
      </Button>
    );
  }

  return (
    <Card className="rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border/60 p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Gavel className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold">{t("New fine")}</h3>
      </div>
      <CardContent className="p-5">
        <form action={addFine} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("Car")}</Label>
            <Select name="vehicle_id" defaultValue="">
              <option value="">{t("— choose a car —")}</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">{t("We'll find who had this car on the date below.")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Violation date")}</Label>
            <Input type="date" name="fine_date" required />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Amount ({currency})", { currency })}</Label>
            <Input type="number" step="0.01" name="amount" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Reference / ticket no.")}</Label>
            <Input type="text" name="reference" placeholder={t("e.g. 2026-00912")} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Location")}</Label>
            <Input type="text" name="location" placeholder={t("e.g. Prishtinë")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Notes (optional)")}</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <SubmitButton>{t("Save fine")}</SubmitButton>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
