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
import { Maximize2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { updateBedPosition } from "@/actions/beds";
import { updatePlantPosition } from "@/actions/plants";
import { Button } from "@/components/ui/button";
import { FAMILY_COLOR_VAR } from "@/lib/plant-families";
import { cellFromOffset, clamp } from "@/lib/plan-geometry";
import { cn } from "@/lib/utils";
import type { BedWithPlants, PlacedPlant } from "@/lib/queries/beds";

/**
 * "Fit" really fits: a 50 m plan on a 360px phone lands at ~7px a cell. Beds
 * become small, but the whole plan is visible, which is the point of the mode —
 * editing happens zoomed in.
 */
const MIN_CELL_PX = 4;
/** Comfortable editing size — a bed corner stays thumb-sized. */
const EDIT_CELL_PX = 44;
const MAX_CELL_PX = 96;

interface BedGridProps {
  cols: number;
  rows: number;
  beds: BedWithPlants[];
  plants: PlacedPlant[];
  canEdit: boolean;
  onSelect: (bed: BedWithPlants) => void;
  onSelectPlant: (plant: PlacedPlant) => void;
  /** Set while a plant from the palette is waiting to be placed. */
  placing?: boolean;
  onPlaceInBed?: (bed: BedWithPlants) => void;
  onPlaceAt?: (gridX: number, gridY: number) => void;
}

export function BedGrid({
  cols,
  rows,
  beds,
  plants,
  canEdit,
  onSelect,
  onSelectPlant,
  placing = false,
  onPlaceInBed,
  onPlaceAt,
}: BedGridProps) {
  const t = useTranslations("beds");
  const tGarden = useTranslations("garden");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  // null = fit to the viewport; a number pins an explicit cell size in px.
  const [pinnedCell, setPinnedCell] = useState<number | null>(null);

  // Local copies so a drag lands instantly; the server call reconciles after.
  const [items, setItems] = useState(beds);
  const [placed, setPlaced] = useState(plants);
  const [lastServerBeds, setLastServerBeds] = useState(beds);
  const [lastServerPlants, setLastServerPlants] = useState(plants);

  // Adjusting state during render (rather than in an effect) is the documented
  // way to resync when props change: https://react.dev/reference/react/useState
  if (lastServerBeds !== beds) {
    setLastServerBeds(beds);
    setItems(beds);
  }
  if (lastServerPlants !== plants) {
    setLastServerPlants(plants);
    setPlaced(plants);
  }

  useLayoutEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const measure = () => setViewportWidth(element.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitCell = viewportWidth > 0 ? Math.max(MIN_CELL_PX, viewportWidth / cols) : MIN_CELL_PX;
  const cell = pinnedCell ?? fitCell;

  const sensors = useSensors(
    // A small threshold keeps taps (open the bed) distinct from drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  function persistBed(next: BedWithPlants) {
    startTransition(async () => {
      const result = await updateBedPosition({
        id: next.id,
        gridX: next.gridX,
        gridY: next.gridY,
        gridW: next.gridW,
        gridH: next.gridH,
      });
      if (!result.ok) {
        toast.error(tErr(result.error as "generic"));
        setItems(beds); // roll back to the server's version
        return;
      }
      router.refresh();
    });
  }

  function persistPlant(next: PlacedPlant) {
    startTransition(async () => {
      const result = await updatePlantPosition({
        id: next.id,
        gridX: next.gridX,
        gridY: next.gridY,
        gridW: next.gridW,
        gridH: next.gridH,
      });
      if (!result.ok) {
        toast.error(tErr(result.error as "generic"));
        setPlaced(plants);
        return;
      }
      router.refresh();
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    // `event.delta` is in screen pixels. That stays comparable with `cell`
    // only because zoom re-lays the grid out at a new cell size — never apply
    // a CSS `transform: scale()` here, it would silently break this maths.
    const bed = items.find((item) => item.id === event.active.id);
    if (bed) {
      const gridX = clamp(bed.gridX + Math.round(event.delta.x / cell), 0, cols - bed.gridW);
      const gridY = clamp(bed.gridY + Math.round(event.delta.y / cell), 0, rows - bed.gridH);
      if (gridX === bed.gridX && gridY === bed.gridY) return;

      const moved = { ...bed, gridX, gridY };
      setItems((current) => current.map((item) => (item.id === bed.id ? moved : item)));
      persistBed(moved);
      return;
    }

    const plant = placed.find((item) => item.id === event.active.id);
    if (!plant) return;

    const gridX = clamp(plant.gridX + Math.round(event.delta.x / cell), 0, cols - plant.gridW);
    const gridY = clamp(plant.gridY + Math.round(event.delta.y / cell), 0, rows - plant.gridH);
    if (gridX === plant.gridX && gridY === plant.gridY) return;

    const moved = { ...plant, gridX, gridY };
    setPlaced((current) => current.map((item) => (item.id === plant.id ? moved : item)));
    persistPlant(moved);
  }

  function handleResize(bed: BedWithPlants, deltaCols: number, deltaRows: number) {
    const gridW = clamp(bed.gridW + deltaCols, 1, cols - bed.gridX);
    const gridH = clamp(bed.gridH + deltaRows, 1, rows - bed.gridY);
    if (gridW === bed.gridW && gridH === bed.gridH) return;

    const resized = { ...bed, gridW, gridH };
    setItems((current) => current.map((item) => (item.id === bed.id ? resized : item)));
    persistBed(resized);
  }

  /** Turns a tap on bare canvas into the cell underneath it. */
  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!placing || !onPlaceAt) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onPlaceAt(
      cellFromOffset(event.clientX - bounds.left, cell, cols),
      cellFromOffset(event.clientY - bounds.top, cell, rows),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canEdit && items.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t("dragHint")}</p>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-touch"
            aria-label={t("zoomOut")}
            onClick={() => setPinnedCell(Math.max(MIN_CELL_PX, Math.round(cell / 1.5)))}
          >
            <Minus className="size-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-touch"
            aria-label={t("zoomFit")}
            aria-pressed={pinnedCell === null}
            onClick={() => setPinnedCell(null)}
          >
            <Maximize2 className="size-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon-touch"
            aria-label={t("zoomIn")}
            onClick={() =>
              setPinnedCell(
                Math.min(MAX_CELL_PX, Math.round(Math.max(cell, EDIT_CELL_PX / 1.5) * 1.5)),
              )
            }
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} modifiers={[restrictToParentElement]} onDragEnd={handleDragEnd}>
        {/* Viewport scrolls; the canvas inside keeps its exact pixel size, so
            every gridX*cell offset — and dnd-kit's parent restriction — still
            refer to the full plan rather than the visible slice. */}
        <div
          ref={viewportRef}
          className="w-full overflow-auto overscroll-contain rounded-2xl border border-border/70 bg-muted/40"
        >
          <div
            onClick={handleCanvasClick}
            className={cn("relative", placing && "cursor-crosshair")}
            style={{
              width: cell * cols,
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
                canEdit={canEdit && !placing}
                onSelect={(event) => {
                  // Without this the click also reaches the canvas handler
                  // below and would place a second plant on bare ground.
                  event.stopPropagation();
                  if (placing) onPlaceInBed?.(bed);
                  else onSelect(bed);
                }}
                onResize={(dx, dy) => handleResize(bed, dx, dy)}
              />
            ))}

            {placed.map((plant) => (
              <PlacedPlantNode
                key={plant.id}
                plant={plant}
                cell={cell}
                canEdit={canEdit && !placing}
                onSelect={(event) => {
                  event.stopPropagation();
                  onSelectPlant(plant);
                }}
              />
            ))}
          </div>
        </div>
      </DndContext>

      <p className="text-xs text-muted-foreground">{tGarden("planScaleHint")}</p>
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
  onSelect: (event: React.MouseEvent) => void;
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

      {/* Below a certain cell size the handle would cover the bed it resizes;
          zooming in brings it back. */}
      {canEdit && cell >= 28 && <ResizeHandle cell={cell} onResize={onResize} label={t("size")} />}
    </div>
  );
}

/** A plant standing on the plan itself: round and dashed, so it never reads as a bed. */
function PlacedPlantNode({
  plant,
  cell,
  canEdit,
  onSelect,
}: {
  plant: PlacedPlant;
  cell: number;
  canEdit: boolean;
  onSelect: (event: React.MouseEvent) => void;
}) {
  const t = useTranslations("plants");
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: plant.id,
    disabled: !canEdit,
  });

  const color = FAMILY_COLOR_VAR[plant.family];
  const compact = plant.gridW * cell < 56;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: plant.gridX * cell,
        top: plant.gridY * cell,
        width: plant.gridW * cell,
        height: plant.gridH * cell,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 21 : 5,
        borderColor: color,
        backgroundColor: `color-mix(in oklab, ${color} 30%, var(--card))`,
      }}
      className={cn(
        "border-2 border-dashed p-0.5 transition-shadow",
        plant.gridW === plant.gridH ? "rounded-full" : "rounded-2xl",
        isDragging ? "shadow-lg" : "shadow-sm",
        canEdit && "touch-none",
      )}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${t("standalone")}: ${plant.name}`}
        title={plant.name}
        className={cn(
          "flex size-full items-center justify-center overflow-hidden text-center",
          plant.gridW === plant.gridH ? "rounded-full" : "rounded-xl",
        )}
      >
        <span
          aria-hidden={compact}
          className="line-clamp-2 px-0.5 text-[0.65rem] leading-tight font-medium"
        >
          {compact ? plant.name.slice(0, 2) : plant.name}
        </span>
      </button>
    </div>
  );
}

/**
 * Corner drag handle. Deliberately not a dnd-kit draggable: it converts its own
 * pointer delta into whole grid cells, and arrow keys do the same by one cell.
 * The hit area is a full 44px even though the visible dot is much smaller.
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
      className="absolute -right-5 -bottom-5 flex size-11 cursor-se-resize touch-none items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="size-4 rounded-full border-2 border-background bg-foreground/70 shadow-sm"
      />
    </span>
  );
}
