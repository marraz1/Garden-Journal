"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

/**
 * Mobile bottom tab bar with a central quick-add button. Everything sits in the
 * thumb zone, which is where the design spec wants the primary actions.
 */
export function BottomNav({ onQuickAdd }: { onQuickAdd: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const [left, right] = [NAV_ITEMS.slice(0, 2), NAV_ITEMS.slice(2)];

  return (
    <nav
      aria-label={t("dashboard")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 glass pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 py-1">
        {left.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} label={t(item.labelKey)} />
        ))}

        <li className="flex justify-center">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={t("add")}
            className="-mt-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform focus-visible:ring-ring active:scale-95"
          >
            <Plus className="size-7" aria-hidden />
          </button>
        </li>

        {right.map((item) => (
          <NavTab key={item.href} item={item} pathname={pathname} label={t(item.labelKey)} />
        ))}
      </ul>
    </nav>
  );
}

function NavTab({
  item,
  pathname,
  label,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
  label: string;
}) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex tap-target flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="size-6" aria-hidden />
        <span className="leading-none">{label}</span>
      </Link>
    </li>
  );
}
