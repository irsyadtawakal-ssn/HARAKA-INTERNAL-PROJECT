import type { ChatMessage } from "./llm";

export const MAX_MESSAGE_CHARS = 2000;

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export function isChatMessage(m: unknown): m is ChatMessage {
  const v = m as ChatMessage | null;
  return (v?.role === "user" || v?.role === "assistant") && typeof v?.content === "string";
}

/** Keeps only well-formed messages, each cut to MAX_MESSAGE_CHARS. */
export function cleanMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isChatMessage).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
}
