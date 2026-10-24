import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

// Week starts on Monday (Europe).
const WEEK_OPTS = { weekStartsOn: 1 as const };

export function resolveRange(
  preset: RangePreset,
  customFrom?: string | null,
  customTo?: string | null,
  now: Date = new Date()
): DateRange {
  switch (preset) {
    case "yesterday": {
      const d = subDays(now, 1);
      return { start: startOfDay(d), end: endOfDay(d), label: "Yesterday" };
    }
    case "this_week":
      return {
        start: startOfWeek(now, WEEK_OPTS),
        end: endOfWeek(now, WEEK_OPTS),
        label: "This week",
      };
    case "last_week": {
      const d = subWeeks(now, 1);
      return {
        start: startOfWeek(d, WEEK_OPTS),
        end: endOfWeek(d, WEEK_OPTS),
        label: "Last week",
      };
    }
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now), label: "This month" };
    case "last_month": {
      const d = subMonths(now, 1);
      return { start: startOfMonth(d), end: endOfMonth(d), label: "Last month" };
    }
    case "this_year":
      return { start: startOfYear(now), end: endOfYear(now), label: "This year" };
    case "custom": {
      const start = customFrom ? startOfDay(new Date(customFrom)) : startOfMonth(now);
      const end = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
      return { start, end, label: "Custom range" };
    }
    case "today":
    default:
      return { start: startOfDay(now), end: endOfDay(now), label: "Today" };
  }
}
