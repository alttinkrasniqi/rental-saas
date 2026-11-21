// Expense categories & payment methods (2.V.14). Values are stable keys stored
// in the DB; labels are English source strings translated in the UI.

export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: "fuel", label: "Fuel" },
  { value: "service", label: "Service / maintenance" },
  { value: "insurance", label: "Insurance" },
  { value: "registration", label: "Registration" },
  { value: "parts", label: "Parts" },
  { value: "cleaning", label: "Cleaning" },
  { value: "salary", label: "Salary" },
  { value: "rent", label: "Rent" },
  { value: "fine", label: "Fine" },
  { value: "other", label: "Other" },
];

export const EXPENSE_METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank transfer" },
];

export function categoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}
