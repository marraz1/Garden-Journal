"use client";

import { useLayoutEffect, useRef, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { updateBedPosition } from "@/actions/beds";
import { FAMILY_COLOR_VAR } from "@/lib/plant-families";
import { cn } from "@/lib/utils";
import type { BedWithPlants } from "@/lib/queries/beds";

const MIN_CELL_PX = 28;

interface BedGridProps {
  cols: number;
  rows: number;
  beds: BedWithPlants[];
  canEdit: boolean;
  onSelect: (bed: BedWithPlants) => void;
}

export function BedGrid({ cols, rows, beds, canEdit, onSelect }: BedGridProps) {
  const t = useTranslations("beds");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(MIN_CELL_PX);
  // Local copy so a drag lands instantly; the server call reconciles after.
  const [items, setItems] = useState(beds);
  const [lastServerBeds, setLastServerBeds] = useState(beds);

  // Adjusting state during render (rather than in an effect) is the documented
  // way to resync when props change: https://react.dev/reference/react/useState
  if (lastServerBeds !== beds) {
    setLastServerBeds(beds);
    setItems(beds);
  }

  // The grid is square-celled, so the cell size follows the container width.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => setCell(Math.max(MIN_CELL_PX, element.clientWidth / cols));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cols]);

  const sensors = useSensors(
    // A small threshold keeps taps (open the bed) distinct from drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  function persist(next: BedWithPlants) {
    startTransition(async () => {
      const result = await updateBedPosition({
        id: next.id,
        gridX: next.gridX,
        gridY: next.gridY,
        gridW: next.gridW,
        gridH: next.gridH,
      });
      if (!result.ok) {
        toast.error(tErr(result.error));
        setItems(beds); // roll back to the server's version
        return;
      }
      router.refresh();
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const bed = items.find((item) => item.id === event.active.id);
    if (!bed) return;

    const gridX = clamp(bed.gridX + Math.round(event.delta.x / cell), 0, cols - bed.gridW);
    const gridY = clamp(bed.gridY + Math.round(event.delta.y / cell), 0, rows - bed.gridH);
    if (gridX === bed.gridX && gridY === bed.gridY) return;

    const moved = { ...bed, gridX, gridY };
    setItems((current) => current.map((item) => (item.id === bed.id ? moved : item)));
    persist(moved);
  }

  function handleResize(bed: BedWithPlants, deltaCols: number, deltaRows: number) {
    const gridW = clamp(bed.gridW + deltaCols, 1, cols - bed.gridX);
    const gridH = clamp(bed.gridH + deltaRows, 1, rows - bed.gridY);
    if (gridW === bed.gridW && gridH === bed.gridH) return;

    const resized = { ...bed, gridW, gridH };
    setItems((current) => current.map((item) => (item.id === bed.id ? resized : item)));
    persist(resized);
  }

  return (
    <div className="flex flex-col gap-3">
      {canEdit && items.length > 0 && (
        <p className="text-sm text-muted-foreground">{t("dragHint")}</p>
      )}

      <DndContext sensors={sensors} modifiers={[restrictToParentElement]} onDragEnd={handleDragEnd}>
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-muted/40"
          style={{
            height: cell * rows,
            // Faint cell grid so the snapping is legible.
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: `${cell}px ${cell}px`,
          }}
        >
          {items.map((bed) => (
            <DraggableBed
              key={bed.id}
              bed={bed}
              cell={cell}
              canEdit={canEdit}
              onSelect={() => onSelect(bed)}
              onResize={(dx, dy) => handleResize(bed, dx, dy)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function DraggableBed({
  bed,
  cell,
  canEdit,
  onSelect,
  onResize,
}: {
  bed: BedWithPlants;
  cell: number;
  canEdit: boolean;
  onSelect: () => void;
  onResize: (deltaCols: number, deltaRows: number) => void;
}) {
  const t = useTranslations("beds");
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: bed.id,
    disabled: !canEdit,
  });

  const color = FAMILY_COLOR_VAR[bed.family];

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: bed.gridX * cell,
        top: bed.gridY * cell,
        width: bed.gridW * cell,
        height: bed.gridH * cell,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 20 : 1,
        borderColor: color,
        backgroundColor: `color-mix(in oklab, ${color} 22%, var(--card))`,
      }}
      className={cn(
        "group rounded-xl border-2 p-1.5 transition-shadow",
        isDragging ? "shadow-lg" : "shadow-sm",
        canEdit && "touch-none",
      )}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${t("openBed")}: ${bed.name}`}
        className="flex size-full flex-col items-start justify-start overflow-hidden rounded-lg px-1 text-left"
      >
        <span className="line-clamp-2 text-[0.8rem] leading-tight font-semibold">{bed.name}</span>
        {bed.plants.length > 0 && (
          <span className="mt-0.5 line-clamp-2 text-[0.7rem] leading-tight text-muted-foreground">
            {bed.plants.map((plant) => plant.name).join(", ")}
          </span>
        )}
      </button>

      {canEdit && <ResizeHandle cell={cell} onResize={onResize} label={t("size")} />}
    </div>
  );
}

/**
 * Corner drag handle. Deliberately not a dnd-kit draggable: it converts its own
 * pointer delta into whole grid cells, and arrow keys do the same by one cell.
 */
function ResizeHandle({
  cell,
  onResize,
  label,
}: {
  cell: number;
  onResize: (deltaCols: number, deltaRows: number) => void;
  label: string;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return (
    <span
      role="slider"
      aria-label={label}
      aria-valuenow={0}
      tabIndex={0}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        if (!start.current) return;
        onResize(
          Math.round((event.clientX - start.current.x) / cell),
          Math.round((event.clientY - start.current.y) / cell),
        );
        start.current = null;
      }}
      onKeyDown={(event) => {
        const moves: Record<string, [number, number]> = {
          ArrowRight: [1, 0],
          ArrowLeft: [-1, 0],
          ArrowDown: [0, 1],
          ArrowUp: [0, -1],
        };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        onResize(move[0], move[1]);
      }}
      className="absolute -right-1.5 -bottom-1.5 size-5 cursor-se-resize touch-none rounded-full border-2 border-background bg-foreground/70 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:size-4"
    />
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
