"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FAMILY_COLOR_VAR, FAMILY_MESSAGE_KEY, PLANT_FAMILIES } from "@/lib/plant-families";
import type { PlantFamily } from "@/db/schema";

/**
 * The colour-dotted plant family picker, shared by the bed form (where it sets
 * an explicit bed colour) and the new-plant form (where it decides the colour a
 * plant paints onto the plan).
 */
export function FamilySelect<T extends string>({
  value,
  onValueChange,
  extraOption,
  id,
}: {
  value: T;
  onValueChange: (value: T) => void;
  /** An extra leading choice, e.g. "auto" on the bed form. */
  extraOption?: { value: T; label: string };
  id?: string;
}) {
  const t = useTranslations("plants");

  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
      <SelectTrigger className="h-11" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {extraOption && <SelectItem value={extraOption.value}>{extraOption.label}</SelectItem>}
        {PLANT_FAMILIES.map((family) => (
          <SelectItem key={family} value={family as T}>
            <span className="flex items-center gap-2">
              <FamilyDot family={family} />
              {t(FAMILY_MESSAGE_KEY[family] as "familyOther")}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FamilyDot({ family, className }: { family: PlantFamily; className?: string }) {
  return (
    <span
      className={className ?? "size-3 shrink-0 rounded-full"}
      style={{ backgroundColor: FAMILY_COLOR_VAR[family] }}
    />
  );
}
