import { describe, expect, it } from "vitest";
import { addDaysIso, bucketForDueDate, todayInAppZone, weekBounds } from "./dates";

describe("todayInAppZone", () => {
  it("uses the Vilnius calendar day, not UTC", () => {
    // 21:30 UTC is already the next day in Vilnius (UTC+3 in summer).
    expect(todayInAppZone(new Date("2026-06-15T21:30:00Z"))).toBe("2026-06-16");
    expect(todayInAppZone(new Date("2026-06-15T10:00:00Z"))).toBe("2026-06-15");
  });

  it("handles the winter offset", () => {
    // UTC+2 in winter: 22:30 UTC is still the same day.
    expect(todayInAppZone(new Date("2026-01-15T21:30:00Z"))).toBe("2026-01-15");
    expect(todayInAppZone(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-16");
  });
});

describe("weekBounds", () => {
  it("returns Monday to Sunday", () => {
    // 2026-05-13 is a Wednesday.
    expect(weekBounds("2026-05-13")).toEqual({ start: "2026-05-11", end: "2026-05-17" });
  });

  it("keeps Sunday in the week that started on Monday", () => {
    expect(weekBounds("2026-05-17")).toEqual({ start: "2026-05-11", end: "2026-05-17" });
  });

  it("keeps Monday at the start of its own week", () => {
    expect(weekBounds("2026-05-11")).toEqual({ start: "2026-05-11", end: "2026-05-17" });
  });
});

describe("addDaysIso", () => {
  it("crosses month boundaries", () => {
    expect(addDaysIso("2026-05-30", 3)).toBe("2026-06-02");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("bucketForDueDate", () => {
  const today = "2026-05-13"; // Wednesday

  it("sorts dates into the four list sections", () => {
    expect(bucketForDueDate("2026-05-12", today)).toBe("overdue");
    expect(bucketForDueDate("2026-05-13", today)).toBe("today");
    expect(bucketForDueDate("2026-05-17", today)).toBe("thisWeek");
    expect(bucketForDueDate("2026-05-18", today)).toBe("later");
  });
});
