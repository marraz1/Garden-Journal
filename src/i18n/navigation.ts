import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware replacements for next/link and the navigation hooks.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
