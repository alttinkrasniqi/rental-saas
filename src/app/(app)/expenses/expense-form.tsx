"use client";

import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";
import { addExpense } from "./actions";
import { EXPENSE_CATEGORIES, EXPENSE_METHODS } from "./constants";

type CarOption = { id: string; label: string };

export function ExpenseForm({ cars, currency }: { cars: CarOption[]; currency: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("Add expense")}
      </Button>
    );
  }

  return (
    <Card className="rounded-2xl">
      <div className="flex items-center gap-2 border-b border-border/60 p-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <Receipt className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold">{t("New expense")}</h3>
      </div>
      <CardContent className="p-5">
        <form action={addExpense} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("Category")}</Label>
            <Select name="category" defaultValue="fuel">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{t(c.label)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Amount ({currency})", { currency })}</Label>
            <Input type="number" step="0.01" name="amount" placeholder="0" required />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Date")}</Label>
            <Input type="date" name="expense_date" defaultValue={today} required />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Method")}</Label>
            <Select name="method" defaultValue="cash">
              {EXPENSE_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{t(m.label)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Car (optional)")}</Label>
            <Select name="vehicle_id" defaultValue="">
              <option value="">{t("Not car-specific")}</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Vendor (optional)")}</Label>
            <Input type="text" name="vendor" placeholder={t("e.g. petrol station")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Notes (optional)")}</Label>
            <Textarea name="notes" rows={2} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <SubmitButton>{t("Save expense")}</SubmitButton>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
