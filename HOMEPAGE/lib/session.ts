export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem("rara-session");
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem("rara-session", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
