import { Sprout } from "lucide-react";

/** Shared centred card used by every authentication screen. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/12 text-primary">
            <Sprout className="size-8" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold text-balance">{title}</h1>
          {subtitle && <p className="text-balance text-muted-foreground">{subtitle}</p>}
        </div>

        {children}

        {footer && <div className="text-center text-sm">{footer}</div>}
      </div>
    </main>
  );
}
