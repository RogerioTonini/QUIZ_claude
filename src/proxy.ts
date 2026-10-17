import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Redirects `/` by Accept-Language (fallback pt-BR) and persists the choice in the NEXT_LOCALE cookie.
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next/Vercel internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
