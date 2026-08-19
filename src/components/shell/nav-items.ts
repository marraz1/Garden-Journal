import { CalendarCheck, Images, LayoutGrid, Map } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", labelKey: "dashboard", icon: LayoutGrid },
  { href: "/plan", labelKey: "plan", icon: Map },
  { href: "/tasks", labelKey: "tasks", icon: CalendarCheck },
  { href: "/progress", labelKey: "progress", icon: Images },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
