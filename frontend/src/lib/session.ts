/** Nama cookie httpOnly yang menyimpan token API. Dipakai proxy, route handler, dan server component. */
export const SESSION_COOKIE = "hk_session";

/** Sama dengan JWT_TTL_MINUTES di backend (12 jam). */
export const SESSION_MAX_AGE_S = 12 * 60 * 60;
