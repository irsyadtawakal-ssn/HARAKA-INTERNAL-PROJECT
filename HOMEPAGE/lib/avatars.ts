/** The avatars a visitor can talk to. Same brain and voice; only the face and the name change. */
export const AVATARS = {
  mira: { id: "mira", name: "Mira", base: "/avatar/mira" },
  rara: { id: "rara", name: "Rara", base: "/avatar" },
} as const;

export type AvatarId = keyof typeof AVATARS;
export type AvatarProfile = (typeof AVATARS)[AvatarId];

export const DEFAULT_AVATAR: AvatarId = "mira";
export const AVATAR_IDS = Object.keys(AVATARS) as AvatarId[];

export const isAvatarId = (v: unknown): v is AvatarId => typeof v === "string" && v in AVATARS;

/** Avatar for a request body value; anything unknown falls back to the default avatar. */
export const toAvatarId = (v: unknown): AvatarId => (isAvatarId(v) ? v : DEFAULT_AVATAR);

export const greetingFor = (name: string) => `Halo Kak, aku ${name}. Ceritakan produk impianmu.`;
