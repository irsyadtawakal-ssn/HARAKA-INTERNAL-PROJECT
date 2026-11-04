import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { getRaraConfig } from "./raraConfig";
import { forAvatar, pickProfileVoice } from "./avatarProfile";
import { synthesize } from "./tts";
import type { AvatarId } from "./avatars";

const CACHE_DIR = path.join(process.cwd(), "data", "tts-cache");

/**
 * The avatar's welcome line as speech. Every visitor hears the same words, so it is made once per
 * greeting text + voice and kept on disk; editing either in the dashboard simply produces a new file.
 */
export async function greetingAudio(avatar: AvatarId): Promise<{ audio: Buffer; etag: string }> {
  const cfg = forAvatar(getRaraConfig(), avatar);
  const text = cfg.visual.greeting;
  const key = createHash("sha1")
    .update(JSON.stringify({ avatar, text, voice: pickProfileVoice(cfg.voice), dict: cfg.voice.pronunciationDictionary }))
    .digest("hex")
    .slice(0, 16);
  const file = path.join(CACHE_DIR, `greeting-${avatar}-${key}.mp3`);
  if (fs.existsSync(file)) return { audio: fs.readFileSync(file), etag: key };

  const audio = Buffer.from(await synthesize(text, undefined, avatar));
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    // Older greetings of this avatar are dead weight once the text or voice changed.
    for (const old of fs.readdirSync(CACHE_DIR)) {
      if (old.startsWith(`greeting-${avatar}-`)) fs.rmSync(path.join(CACHE_DIR, old), { force: true });
    }
    fs.writeFileSync(file, audio);
  } catch {
    // Read-only disk: still answer, just without caching.
  }
  return { audio, etag: key };
}
