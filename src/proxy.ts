import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

// Next.js 16 renamed the middleware convention to `proxy`; behaviour is the same.
const handleI18n = createMiddleware(routing);

// Routes reachable without a session. Everything else redirects to sign-in.
const PUBLIC_PATHS = ["/sign-in", "/join"];

function isPublic(pathname: string): boolean {
  // Strip the optional locale prefix before matching.
  const withoutLocale = pathname.replace(/^\/(?:lt|en)(?=\/|$)/, "") || "/";
  return PUBLIC_PATHS.some((p) => withoutLocale === p || withoutLocale.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const response = handleI18n(request);

  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return response;

  // Optimistic session check only — every server action and loader re-checks
  // the real session and garden membership via src/lib/guards.ts.
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  // Skip API routes, Next internals and anything with a file extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
