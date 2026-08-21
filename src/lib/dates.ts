import { addDays, format, parseISO } from "date-fns";

/**
 * Gardening is date-driven and the audience is in one country, so the whole app
 * pins to a single zone rather than the viewer's device clock. That keeps
 * "today's tasks" identical on the server and on a phone that is travelling.
 */
export const APP_TIME_ZONE = "Europe/Vilnius";

/** Current date in the app timezone, as `yyyy-MM-dd`. */
export function todayInAppZone(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDaysIso(isoDate: string, days: number): string {
  return format(addDays(parseISO(isoDate), days), "yyyy-MM-dd");
}

/** Monday-based week bounds containing `isoDate`, inclusive. */
export function weekBounds(isoDate: string): { start: string; end: string } {
  const date = parseISO(isoDate);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  return {
    start: format(addDays(date, 1 - day), "yyyy-MM-dd"),
    end: format(addDays(date, 7 - day), "yyyy-MM-dd"),
  };
}

export type DueBucket = "overdue" | "today" | "thisWeek" | "later";

/** Which section of the task list a due date belongs in. */
export function bucketForDueDate(dueDate: string, today: string): DueBucket {
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate <= weekBounds(today).end) return "thisWeek";
  return "later";
}
