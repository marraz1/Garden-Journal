import type { PlantFamily } from "@/db/schema";

/**
 * Bed colours come from the plant family growing in them. Tailwind cannot
 * generate class names from runtime values, so beds read the CSS variable
 * directly through an inline style.
 */
export const FAMILY_COLOR_VAR: Record<PlantFamily, string> = {
  leafy: "var(--family-leafy)",
  nightshade: "var(--family-nightshade)",
  root: "var(--family-root)",
  legume: "var(--family-legume)",
  brassica: "var(--family-brassica)",
  allium: "var(--family-allium)",
  cucurbit: "var(--family-cucurbit)",
  herb: "var(--family-herb)",
  berry: "var(--family-berry)",
  other: "var(--family-other)",
};

export const FAMILY_MESSAGE_KEY: Record<PlantFamily, string> = {
  leafy: "familyLeafy",
  nightshade: "familyNightshade",
  root: "familyRoot",
  legume: "familyLegume",
  brassica: "familyBrassica",
  allium: "familyAllium",
  cucurbit: "familyCucurbit",
  herb: "familyHerb",
  berry: "familyBerry",
  other: "familyOther",
};

export const PLANT_FAMILIES = Object.keys(FAMILY_COLOR_VAR) as PlantFamily[];
