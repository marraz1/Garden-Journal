import { describe, expect, it } from "vitest";
import {
  cellFromOffset,
  cellsToArea,
  clamp,
  clampRect,
  isCellFree,
  planArea,
  rectChanged,
  rectsOverlap,
  type Rect,
} from "./plan-geometry";

const rect = (gridX: number, gridY: number, gridW: number, gridH: number): Rect => ({
  gridX,
  gridY,
  gridW,
  gridH,
});

describe("clamp", () => {
  it("bounds a value on both sides", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe("clampRect", () => {
  it("leaves a rectangle that already fits alone", () => {
    expect(clampRect(rect(2, 3, 4, 2), 12, 12)).toEqual(rect(2, 3, 4, 2));
  });

  it("pulls a bed back inside when the plan shrinks", () => {
    // A bed at the far corner of a 12×12 plan, after shrinking to 6×6.
    expect(clampRect(rect(10, 10, 3, 2), 6, 6)).toEqual(rect(3, 4, 3, 2));
  });

  it("shrinks before repositioning, so an oversized bed still fits", () => {
    const fitted = clampRect(rect(0, 0, 20, 20), 5, 4);
    expect(fitted).toEqual(rect(0, 0, 5, 4));
  });

  it("never returns a rectangle smaller than one cell", () => {
    const fitted = clampRect(rect(0, 0, 0, -4), 8, 8);
    expect(fitted.gridW).toBe(1);
    expect(fitted.gridH).toBe(1);
  });

  it("never returns a negative offset", () => {
    const fitted = clampRect(rect(-5, -5, 2, 2), 8, 8);
    expect(fitted.gridX).toBe(0);
    expect(fitted.gridY).toBe(0);
  });

  it("is idempotent", () => {
    const once = clampRect(rect(10, 10, 9, 9), 6, 6);
    expect(clampRect(once, 6, 6)).toEqual(once);
  });
});

describe("rectChanged", () => {
  it("detects a difference in any coordinate", () => {
    expect(rectChanged(rect(1, 1, 2, 2), rect(1, 1, 2, 2))).toBe(false);
    expect(rectChanged(rect(1, 1, 2, 2), rect(0, 1, 2, 2))).toBe(true);
    expect(rectChanged(rect(1, 1, 2, 2), rect(1, 1, 2, 3))).toBe(true);
  });
});

describe("area", () => {
  it("reads a cell as one square metre", () => {
    expect(cellsToArea(3, 2)).toBe(6);
    expect(planArea(12, 12)).toBe(144);
    expect(planArea(50, 50)).toBe(2500);
  });
});

describe("cellFromOffset", () => {
  it("floors an offset into a cell index", () => {
    expect(cellFromOffset(0, 28, 12)).toBe(0);
    expect(cellFromOffset(27, 28, 12)).toBe(0);
    expect(cellFromOffset(28, 28, 12)).toBe(1);
    expect(cellFromOffset(85, 28, 12)).toBe(3);
  });

  it("clamps at both ends", () => {
    expect(cellFromOffset(-40, 28, 12)).toBe(0);
    expect(cellFromOffset(10_000, 28, 12)).toBe(11);
  });

  it("survives a zero cell size rather than dividing by zero", () => {
    expect(cellFromOffset(50, 0, 12)).toBe(0);
  });
});

describe("rectsOverlap", () => {
  it("is false for rectangles that only touch along an edge", () => {
    expect(rectsOverlap(rect(0, 0, 2, 2), rect(2, 0, 2, 2))).toBe(false);
    expect(rectsOverlap(rect(0, 0, 2, 2), rect(0, 2, 2, 2))).toBe(false);
  });

  it("is true when they share any cell", () => {
    expect(rectsOverlap(rect(0, 0, 2, 2), rect(1, 1, 2, 2))).toBe(true);
  });

  it("is true for containment, in both directions", () => {
    expect(rectsOverlap(rect(0, 0, 6, 6), rect(2, 2, 1, 1))).toBe(true);
    expect(rectsOverlap(rect(2, 2, 1, 1), rect(0, 0, 6, 6))).toBe(true);
  });
});

describe("isCellFree", () => {
  const occupied = [rect(0, 0, 3, 2), rect(5, 5, 1, 1)];

  it("accepts an empty spot", () => {
    expect(isCellFree(rect(4, 0, 1, 1), occupied)).toBe(true);
  });

  it("rejects a spot inside a bed", () => {
    expect(isCellFree(rect(1, 1, 1, 1), occupied)).toBe(false);
  });

  it("accepts anything when the plan is empty", () => {
    expect(isCellFree(rect(0, 0, 1, 1), [])).toBe(true);
  });
});
