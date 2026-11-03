import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Pemeriksaan cepat: tanpa cookie sesi -> ke /login. Keabsahan token dicek ulang di layout (app)
 * lewat /auth/me, jadi /login sengaja tidak pernah dialihkan dari sini (mencegah redirect berputar
 * saat cookie ada tapi tokennya sudah dicabut).
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/login" || req.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
