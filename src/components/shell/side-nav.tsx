"use client";

import { useTranslations } from "next-intl";
import { Plus, Settings, Sprout } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

/** Desktop counterpart of the bottom tab bar. */
export function SideNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border/70 bg-sidebar px-4 py-6 md:flex">
      <Link href="/" className="flex items-center gap-2 px-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Sprout className="size-5" aria-hidden />
        </span>
        <span className="text-base font-semibold">{tc("appName")}</span>
      </Link>

      <Button size="touch" onClick={onQuickAdd} className="justify-start">
        <Plus className="size-5" aria-hidden />
        {t("add")}
      </Button>

      <nav aria-label={t("dashboard")}>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex tap-target items-center gap-3 rounded-xl px-3 py-2 text-[0.95rem] font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link
        href="/settings"
        className="mt-auto flex tap-target items-center gap-3 rounded-xl px-3 py-2 text-[0.95rem] font-medium text-muted-foreground hover:text-foreground"
      >
        <Settings className="size-5" aria-hidden />
        {t("settings")}
      </Link>
    </aside>
  );
}
