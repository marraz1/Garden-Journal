import { describe, expect, it } from "vitest";
import { describeRecurrence, isValidRule, nextDueDate } from "./recurrence";

describe("nextDueDate", () => {
  it("advances daily rules by the interval", () => {
    expect(nextDueDate({ freq: "daily", interval: 1 }, "2026-05-10")).toBe("2026-05-11");
    expect(nextDueDate({ freq: "daily", interval: 2 }, "2026-05-10")).toBe("2026-05-12");
  });

  it("crosses month and year boundaries", () => {
    expect(nextDueDate({ freq: "daily", interval: 3 }, "2026-05-30")).toBe("2026-06-02");
    expect(nextDueDate({ freq: "daily", interval: 1 }, "2026-12-31")).toBe("2027-01-01");
  });

  it("handles leap days", () => {
    expect(nextDueDate({ freq: "daily", interval: 1 }, "2028-02-28")).toBe("2028-02-29");
    expect(nextDueDate({ freq: "monthly", interval: 1 }, "2028-01-31")).toBe("2028-02-29");
  });

  it("clamps monthly overflow to the end of the shorter month", () => {
    expect(nextDueDate({ freq: "monthly", interval: 1 }, "2026-01-31")).toBe("2026-02-28");
    expect(nextDueDate({ freq: "monthly", interval: 3 }, "2026-03-31")).toBe("2026-06-30");
  });

  it("advances weekly rules without weekdays by whole weeks", () => {
    expect(nextDueDate({ freq: "weekly", interval: 1 }, "2026-05-10")).toBe("2026-05-17");
    expect(nextDueDate({ freq: "weekly", interval: 2 }, "2026-05-10")).toBe("2026-05-24");
  });

  it("picks the next selected weekday within the same week", () => {
    // 2026-05-11 is a Monday; next selected day is Thursday (4).
    expect(nextDueDate({ freq: "weekly", interval: 1, weekdays: [1, 4] }, "2026-05-11")).toBe(
      "2026-05-14",
    );
  });

  it("wraps to the following week when no selected weekday remains", () => {
    // 2026-05-14 is a Thursday, the last selected day, so wrap to Monday.
    expect(nextDueDate({ freq: "weekly", interval: 1, weekdays: [1, 4] }, "2026-05-14")).toBe(
      "2026-05-18",
    );
  });

  it("respects the week interval when wrapping", () => {
    // Every 2 weeks on Monday: skip a whole week before landing on Monday.
    expect(nextDueDate({ freq: "weekly", interval: 2, weekdays: [1] }, "2026-05-11")).toBe(
      "2026-05-25",
    );
  });

  it("treats Sunday as ISO weekday 7", () => {
    // 2026-05-17 is a Sunday; wrapping lands on the next Monday.
    expect(nextDueDate({ freq: "weekly", interval: 1, weekdays: [1, 7] }, "2026-05-17")).toBe(
      "2026-05-18",
    );
  });

  it("returns null once the series end date is passed", () => {
    expect(nextDueDate({ freq: "daily", interval: 1 }, "2026-05-10", "2026-05-10")).toBeNull();
    expect(nextDueDate({ freq: "daily", interval: 1 }, "2026-05-10", "2026-05-11")).toBe(
      "2026-05-11",
    );
  });

  it("returns null for missing or invalid rules", () => {
    expect(nextDueDate(null, "2026-05-10")).toBeNull();
    expect(nextDueDate({ freq: "daily", interval: 0 }, "2026-05-10")).toBeNull();
    expect(nextDueDate({ freq: "weekly", interval: 1, weekdays: [0] }, "2026-05-10")).toBeNull();
    expect(nextDueDate({ freq: "weekly", interval: 1, weekdays: [] }, "2026-05-10")).toBeNull();
  });

  it("de-duplicates weekdays", () => {
    expect(nextDueDate({ freq: "weekly", interval: 1, weekdays: [4, 4, 1] }, "2026-05-11")).toBe(
      "2026-05-14",
    );
  });
});

describe("isValidRule", () => {
  it("rejects out-of-range intervals", () => {
    expect(isValidRule({ freq: "daily", interval: 366 })).toBe(false);
    expect(isValidRule({ freq: "daily", interval: 1.5 })).toBe(false);
    expect(isValidRule({ freq: "daily", interval: 1 })).toBe(true);
  });
});

describe("describeRecurrence", () => {
  it("returns translation keys rather than prose", () => {
    expect(describeRecurrence({ freq: "daily", interval: 1 }).key).toBe("dailyEvery");
    expect(describeRecurrence({ freq: "daily", interval: 3 })).toEqual({
      key: "dailyEveryN",
      values: { interval: 3 },
    });
    expect(describeRecurrence({ freq: "weekly", interval: 1, weekdays: [4, 1] })).toEqual({
      key: "weeklyOnDays",
      values: { interval: 1, days: "1,4" },
    });
  });
});
