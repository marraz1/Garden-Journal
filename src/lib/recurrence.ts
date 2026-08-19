import { addDays, addMonths, format, isAfter, parseISO } from "date-fns";

export type RecurrenceFreq = "daily" | "weekly" | "monthly";

/**
 * Recurrence is stored on the task row rather than expanded into a table of
 * occurrences. When an occurrence is completed the next one is materialised —
 * see `nextDueDate`. `weekdays` uses ISO numbering: 1 = Monday … 7 = Sunday.
 */
export interface RecurrenceRule {
  freq: RecurrenceFreq;
  interval: number;
  weekdays?: number[];
}

/** ISO weekday (1 = Monday … 7 = Sunday). */
function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

export function toDateString(value: Date | string): string {
  return format(toDate(value), "yyyy-MM-dd");
}

export function isValidRule(rule: RecurrenceRule | null | undefined): rule is RecurrenceRule {
  if (!rule) return false;
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 365) return false;
  if (rule.freq === "weekly" && rule.weekdays) {
    if (rule.weekdays.length === 0) return false;
    if (rule.weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) return false;
  }
  return ["daily", "weekly", "monthly"].includes(rule.freq);
}

/**
 * The next due date strictly after `from`, or null when the rule is invalid or
 * the series has passed `endsAt`.
 */
export function nextDueDate(
  rule: RecurrenceRule | null | undefined,
  from: Date | string,
  endsAt?: Date | string | null,
): string | null {
  if (!isValidRule(rule)) return null;

  const current = toDate(from);
  let next: Date;

  switch (rule.freq) {
    case "daily":
      next = addDays(current, rule.interval);
      break;

    case "weekly": {
      const weekdays = [...new Set(rule.weekdays ?? [])].sort((a, b) => a - b);
      if (weekdays.length === 0) {
        next = addDays(current, 7 * rule.interval);
        break;
      }
      const currentDay = isoWeekday(current);
      const laterThisWeek = weekdays.find((d) => d > currentDay);
      if (laterThisWeek !== undefined) {
        next = addDays(current, laterThisWeek - currentDay);
      } else {
        // Jump to the Monday of the target week, then to its first weekday.
        const daysToNextMonday = 8 - currentDay;
        const skipWeeks = (rule.interval - 1) * 7;
        next = addDays(current, daysToNextMonday + skipWeeks + (weekdays[0] - 1));
      }
      break;
    }

    case "monthly":
      // date-fns clamps overflowing days: 31 Jan + 1 month = 28/29 Feb.
      next = addMonths(current, rule.interval);
      break;
  }

  if (endsAt && isAfter(next, toDate(endsAt))) return null;
  return format(next, "yyyy-MM-dd");
}

/**
 * Translation key plus interpolation values for rendering a rule in the UI.
 * Keeps all copy in messages/*.json rather than hardcoded strings.
 */
export function describeRecurrence(rule: RecurrenceRule): {
  key: string;
  values: Record<string, string | number>;
} {
  if (rule.freq === "weekly" && rule.weekdays?.length) {
    return {
      key: rule.interval === 1 ? "weeklyOnDays" : "everyNWeeksOnDays",
      values: {
        interval: rule.interval,
        days: [...rule.weekdays].sort((a, b) => a - b).join(","),
      },
    };
  }
  const suffix = rule.interval === 1 ? "Every" : "EveryN";
  return { key: `${rule.freq}${suffix}`, values: { interval: rule.interval } };
}
