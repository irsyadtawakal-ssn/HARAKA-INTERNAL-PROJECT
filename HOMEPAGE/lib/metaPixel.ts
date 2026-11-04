/** Meta Pixel IDs are numeric; anything else would break the inline snippet, so it is treated as "off". */
export const isPixelId = (id: string | undefined): id is string => !!id && /^\d{5,20}$/.test(id);

type Fbq = (cmd: "track" | "trackCustom", event: string, params?: Record<string, unknown>) => void;

/** Sends a pixel event when the pixel is loaded on this page; a no-op otherwise (no ID, ad blocker, tests). */
export function trackPixel(event: string, params?: Record<string, unknown>, custom = false) {
  const fbq = (window as Window & { fbq?: Fbq }).fbq;
  if (typeof fbq !== "function") return;
  try {
    fbq(custom ? "trackCustom" : "track", event, params);
  } catch {
    // A broken pixel must never break the chat.
  }
}
