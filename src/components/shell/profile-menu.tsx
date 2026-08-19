"use client";

import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Languages, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = { lt: "Lietuvių", en: "English" };

export function ProfileMenu({
  name,
  email,
  image,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const t = useTranslations("common");
  const tAuth = useTranslations("auth");
  const tNav = useTranslations("nav");
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const initials = (name ?? email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-touch" aria-label={tNav("profile")}>
          <Avatar className="size-9">
            {image && <AvatarImage src={image} alt="" />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium">{name ?? tAuth("signedInAs", { name: "" })}</span>
          {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => router.push("/settings")} className="gap-2">
          <Settings className="size-4" aria-hidden />
          {tNav("settings")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t("theme")}
        </DropdownMenuLabel>
        {(
          [
            ["light", Sun, t("themeLight")],
            ["dark", Moon, t("themeDark")],
            ["system", Monitor, t("themeSystem")],
          ] as const
        ).map(([value, Icon, label]) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)} className="gap-2">
            <Icon className="size-4" aria-hidden />
            {label}
            {theme === value && <span className="ml-auto text-xs text-primary">●</span>}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t("language")}
        </DropdownMenuLabel>
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => router.replace(pathname, { locale: code })}
            className="gap-2"
          >
            <Languages className="size-4" aria-hidden />
            {LOCALE_LABELS[code]}
            {locale === code && <span className="ml-auto text-xs text-primary">●</span>}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => signOut({ redirectTo: "/sign-in" })} className="gap-2">
          <LogOut className="size-4" aria-hidden />
          {tAuth("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
