"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, getDaysInMonth, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FAMILY_COLOR_VAR } from "@/lib/plant-families";
import type { TaskRow as Task } from "@/lib/queries/tasks";

/** Month grid with a dot per day that has open work, plus the selected day's list. */
export function TaskCalendar({
  tasks,
  today,
  locale,
  onSelectDate,
  selectedDate,
}: {
  tasks: Task[];
  today: string;
  locale: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const t = useTranslations("tasks");
  const [cursor, setCursor] = useState(() => parseISO(`${selectedDate.slice(0, 7)}-01`));

  const countsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      if (task.status !== "open") continue;
      map.set(task.dueDate, (map.get(task.dueDate) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    cursor,
  );
  const daysInMonth = getDaysInMonth(cursor);
  const monthPrefix = format(cursor, "yyyy-MM");
  // Monday-based offset for the first cell.
  const firstWeekday = (parseISO(`${monthPrefix}-01`).getDay() + 6) % 7;

  const weekdayNames = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, index + 1)),
    ),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-touch"
          aria-label={t("listView")}
          onClick={() => setCursor((value) => addMonths(value, -1))}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Button>
        <span className="text-base font-semibold capitalize">{monthLabel}</span>
        <Button
          variant="ghost"
          size="icon-touch"
          aria-label={t("calendarView")}
          onClick={() => setCursor((value) => addMonths(value, 1))}
        >
          <ChevronRight className="size-5" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayNames.map((name, index) => (
          <span
            key={index}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
            aria-hidden
          >
            {name}
          </span>
        ))}

        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`pad-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const iso = `${monthPrefix}-${String(day).padStart(2, "0")}`;
          const count = countsByDate.get(iso) ?? 0;
          const isToday = iso === today;
          const isSelected = iso === selectedDate;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              className={cn(
                "flex tap-target flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-sm transition-colors",
                isSelected && "bg-primary font-semibold text-primary-foreground",
                !isSelected && isToday && "ring-2 ring-primary/50",
                !isSelected && "hover:bg-accent",
              )}
            >
              <span>{day}</span>
              <span
                className="size-1.5 rounded-full"
                style={{
                  backgroundColor: count > 0 ? FAMILY_COLOR_VAR.leafy : "transparent",
                }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
