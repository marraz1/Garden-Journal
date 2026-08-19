"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck, Camera, Sprout } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { GardenSummary } from "@/lib/gardens";
import { BottomNav } from "./bottom-nav";
import { GardenSwitcher } from "./garden-switcher";
import { ProfileMenu } from "./profile-menu";
import { SideNav } from "./side-nav";

interface AppShellProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  gardens: GardenSummary[];
  activeGardenId: string | null;
  children: React.ReactNode;
}

export function AppShell({ user, gardens, activeGardenId, children }: AppShellProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <SideNav onQuickAdd={() => setQuickAddOpen(true)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border/70 glass px-2 pt-[env(safe-area-inset-top)] sm:px-4">
          <GardenSwitcher gardens={gardens} activeGardenId={activeGardenId} />
          <ProfileMenu name={user.name} email={user.email} image={user.image} />
        </header>

        {/* Bottom padding keeps content clear of the mobile tab bar. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 sm:px-6 md:pb-10">
          {children}
        </main>
      </div>

      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />

      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

function QuickAddSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const router = useRouter();

  const actions = [
    { icon: CalendarCheck, label: t("tasks.add"), href: "/tasks?new=1" },
    { icon: Camera, label: t("progress.add"), href: "/progress?new=1" },
    { icon: Sprout, label: t("beds.add"), href: "/plan?new=1" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        <SheetHeader>
          <SheetTitle>{t("nav.add")}</SheetTitle>
        </SheetHeader>

        <div className="grid gap-2 px-4">
          {actions.map(({ icon: Icon, label, href }) => (
            <button
              key={href}
              type="button"
              onClick={() => {
                onOpenChange(false);
                router.push(href);
              }}
              className="flex items-center gap-3 rounded-2xl px-4 py-4 text-left text-base font-medium transition-colors hover:bg-accent"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Icon className="size-5" aria-hidden />
              </span>
              {label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
