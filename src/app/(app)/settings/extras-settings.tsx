import { getT } from "@/lib/i18n/server";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { addExtra, updateExtra, deleteExtra } from "./extras-actions";
import type { ExtraDef } from "@/lib/extras";

export function ExtrasSettings({ extras, currency }: { extras: ExtraDef[]; currency: string }) {
  const t = getT();
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t("Optional charges you can add to any rental. Per-day items multiply by the number of days.")}
      </p>

      {extras.length > 0 && (
        <div className="space-y-2">
          {extras.map((e) => (
            <div key={e.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
              <form action={updateExtra} className="flex flex-1 flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={e.id} />
                <div className="min-w-[140px] flex-1 space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">{t("Name")}</label>
                  <Input name="name" defaultValue={e.name} />
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">{t("Type")}</label>
                  <Select name="kind" defaultValue={e.kind}>
                    <option value="flat">{t("One-off")}</option>
                    <option value="per_day">{t("Per day")}</option>
                  </Select>
                </div>
                <div className="w-28 space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">{t("Price ({currency})", { currency })}</label>
                  <Input name="price" type="number" step="0.01" defaultValue={(e.unit_cents / 100).toString()} />
                </div>
                <SubmitButton className="h-10">{t("Save")}</SubmitButton>
              </form>
              <form action={deleteExtra}>
                <input type="hidden" name="id" value={e.id} />
                <SubmitButton className="h-10 border border-border bg-transparent text-rose-600 hover:bg-muted">
                  {t("Delete")}
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
      )}

      <form action={addExtra} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
        <div className="min-w-[140px] flex-1 space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">{t("Name")}</label>
          <Input name="name" placeholder={t("e.g. Extra driver")} />
        </div>
        <div className="w-32 space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">{t("Type")}</label>
          <Select name="kind" defaultValue="flat">
            <option value="flat">{t("One-off")}</option>
            <option value="per_day">{t("Per day")}</option>
          </Select>
        </div>
        <div className="w-28 space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">{t("Price ({currency})", { currency })}</label>
          <Input name="price" type="number" step="0.01" placeholder="10" />
        </div>
        <SubmitButton className="h-10">{t("Add")}</SubmitButton>
      </form>
    </div>
  );
}
