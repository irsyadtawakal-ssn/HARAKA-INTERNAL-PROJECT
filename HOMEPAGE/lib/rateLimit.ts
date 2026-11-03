// In-memory sliding window. Per serverless instance only — good enough for the internal demo.
const hits = new Map<string, number[]>();

export function checkLimit(key: string, max: number, windowMs: number, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
