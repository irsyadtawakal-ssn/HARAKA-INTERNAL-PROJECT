import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

export function apiUrl(path: string): string {
  const base = process.env.API_URL;
  if (!base) throw new Error("API_URL belum diisi di .env.local");
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** Panggil FastAPI dari server component dengan token dari cookie sesi. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return fetch(apiUrl(path), {
    ...init,
    headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  });
}
