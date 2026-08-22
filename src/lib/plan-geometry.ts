/**
 * Grid maths for the plan editor, kept in one place so the client, the server
 * actions and the tests all agree on what a cell is and where a rectangle may
 * sit. Pure — no database, no React, no `server-only`.
 */

/**
 * One plan cell is one square metre. Fixed by design rather than stored per
 * garden: the design requirements ask for a grid editor, "ne laisva forma su
 * tiksliais matmenimis", so the cell stays the unit of interaction and simply
 * gains a real-world meaning.
 */
export const CELL_METRES = 1;

/** Bounds for a garden's plan, in cells (and therefore in metres). */
export const MIN_GRID = 4;
export const MAX_GRID = 50;

/** Anything positioned on the plan: a bed, or a free-standing plant. */
export interface Rect {
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Fits a rectangle inside a cols×rows grid. Width and height shrink first, so
 * a rectangle larger than the whole plan still ends up somewhere valid rather
 * than being pushed to a negative offset.
 */
export function clampRect(rect: Rect, cols: number, rows: number): Rect {
  const gridW = clamp(rect.gridW, 1, Math.max(1, cols));
  const gridH = clamp(rect.gridH, 1, Math.max(1, rows));

  return {
    gridW,
    gridH,
    gridX: clamp(rect.gridX, 0, Math.max(0, cols - gridW)),
    gridY: clamp(rect.gridY, 0, Math.max(0, rows - gridH)),
  };
}

/** True when the two rectangles differ in any coordinate. */
export function rectChanged(a: Rect, b: Rect): boolean {
  return a.gridX !== b.gridX || a.gridY !== b.gridY || a.gridW !== b.gridW || a.gridH !== b.gridH;
}

/** Area in m², given that one cell is one square metre. */
export function cellsToArea(width: number, height: number): number {
  return width * height * CELL_METRES ** 2;
}

export function planArea(cols: number, rows: number): number {
  return cellsToArea(cols, rows);
}

/**
 * Which cell a pointer offset falls in. `max` is the cell count on that axis,
 * so the result is always a usable index.
 */
export function cellFromOffset(offset: number, cellPx: number, max: number): number {
  if (cellPx <= 0) return 0;
  return clamp(Math.floor(offset / cellPx), 0, Math.max(0, max - 1));
}

/** Rectangles that merely touch along an edge do not overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.gridX < b.gridX + b.gridW &&
    b.gridX < a.gridX + a.gridW &&
    a.gridY < b.gridY + b.gridH &&
    b.gridY < a.gridY + a.gridH
  );
}

/** True when `rect` is clear of everything already on the plan. */
export function isCellFree(rect: Rect, occupied: Rect[]): boolean {
  return !occupied.some((other) => rectsOverlap(rect, other));
}
