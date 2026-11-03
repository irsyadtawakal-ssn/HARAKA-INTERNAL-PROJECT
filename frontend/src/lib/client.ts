"use client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function detailOf(data: unknown, status: number): string {
  const d = (data as { detail?: unknown })?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return `Isian tidak valid: ${d[0].msg}`;
  return status >= 500 ? "Terjadi gangguan di server. Coba lagi sebentar." : "Permintaan ditolak server.";
}

/** Panggil FastAPI lewat proxy Next.js (/api/backend/*). Sesi habis -> kembali ke halaman login. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401) {
    // Fungsi ini bukan komponen (tidak ada router); muat penuh juga membuang state halaman milik sesi lama.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  if (!res.ok) throw new ApiError(res.status, detailOf(data, res.status));
  return data as T;
}
