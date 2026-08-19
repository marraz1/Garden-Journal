import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

// Next.js 16 renamed the middleware convention to `proxy`; behaviour is the same.
const handleI18n = createMiddleware(routing);

// Routes reachable without a session. Everything else redirects to sign-in.
const PUBLIC_PATHS = ["/sign-in", "/join"];

const LOCALE_PREFIX = new RegExp(`^/(?:${routing.locales.join("|")})(?=/|$)`);

/** Splits `/en/plan` into its locale prefix and the locale-free path. */
function splitLocale(pathname: string): { prefix: string; path: string } {
  const match = pathname.match(LOCALE_PREFIX);
  const prefix = match?.[0] ?? "";
  return { prefix, path: pathname.slice(prefix.length) || "/" };
}

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const response = handleI18n(request);

  const { prefix, path } = splitLocale(request.nextUrl.pathname);
  if (isPublic(path)) return response;

  // Optimistic session check only — every server action and loader re-checks
  // the real session and garden membership via src/lib/guards.ts.
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    // Keep the viewer's locale, and hand back a locale-free callback path so
    // next-intl's Link/redirect helpers can re-prefix it after signing in.
    const signInUrl = new URL(`${prefix}/sign-in`, request.url);
    signInUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  // Skip API routes, Next internals and anything with a file extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
