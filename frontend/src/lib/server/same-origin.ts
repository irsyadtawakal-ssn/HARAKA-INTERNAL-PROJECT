import "server-only";
import type { NextRequest } from "next/server";

/** Tolak permintaan tulis dari situs lain (CSRF). Klien non-browser tidak membawa cookie sesi otomatis. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}
