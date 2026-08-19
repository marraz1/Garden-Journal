"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * The shell's quick-add button links to a section with `?new=1`. This turns
 * that flag into dialog state without an effect, and clears it on dismiss so
 * the dialog does not reopen on the next render.
 */
export function useQuickAddDialog(enabled: boolean) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const requested = enabled && searchParams.get("new") === "1";
  // null means "follow the URL"; a boolean is an explicit user choice.
  const [override, setOverride] = useState<boolean | null>(null);

  return {
    open: override ?? requested,
    setOpen(next: boolean) {
      setOverride(next);
      if (!next && requested) router.replace(pathname);
    },
  };
}
