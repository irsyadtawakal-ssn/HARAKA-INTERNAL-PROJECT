# AI Avatar "Rara" — Haraka Erfi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone one-page site, desktop first, where a breathing "Soft Skin" avatar answers questions about Haraka Erfi's cosmetic contract manufacturing by voice and text, and turns intent into saved, emailed leads. Version 1 is an internal demo.

**Architecture:** A Next.js app on Vercel. All API keys stay in server route handlers: `/api/chat` (LLM), `/api/tts` (ElevenLabs) and `/api/lead` (Supabase + email). The browser runs a small conversation controller. It turns speech into text with the Web Speech API, calls those routes and plays the audio. It also drives an `Avatar` component through four states, `idle | listening | thinking | speaking`. The avatar is swappable: placeholder mode now, video-clip mode when the owner's clips arrive, and a real-time avatar later.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Vitest + Testing Library (jsdom), `@supabase/supabase-js` v2, an OpenAI-compatible chat endpoint via `fetch` (default: Google Gemini's OpenAI-compatible endpoint, free tier), ElevenLabs REST TTS, Resend REST for email.

**Spec:** `docs/superpowers/specs/2026-10-30-ai-avatar-haraka-design.md`

## Global Constraints

- **Release scope:** v1 is an internal demo for the boss and is not public. Free tiers: Vercel, Supabase, ElevenLabs, and an LLM that has a free tier.
- **Secrets:** API keys never reach the browser. No `NEXT_PUBLIC_` prefix on any key.
- **Layout:** desktop first. On phones the page must not break: one column, avatar on top, input at the bottom, no horizontal scroll. No polish beyond that.
- **Language:** Bahasa Indonesia only. Persona placeholder: name "Rara", addresses the visitor as "Kak", friendly and professional. Answers are 2–4 sentences, one question per turn.
- **Never invent numbers:** no price, MOQ, duration or certificate number unless it is in the knowledge file. If missing → answer generally and steer to sales.
- **Claims:** no medical claims, no promised results, no talking down competitors. Off-topic questions are answered briefly, then steered back to cosmetics and manufacturing.
- **Visual direction:** "Soft Skin". Warm cream-pink background, avatar framed head to shoulders (not ultra close-up), floating glass fact cards (18+ brand partner · Skincare/Bodycare/Haircare/Parfum · 6 tahap · Sejak 2015 · CPKB·BPOM·HALAL), and a bottom stack of avatar line (serif) → quick-question chips → input bar with mic. Reference mockup: `.superpowers/brainstorm/669-1793325980/content/soft-skin-v2.html` (local only, gitignored).
- **Reference images:** files from `REFERENSI MODEL/` are placeholder only and must never ship in a public build.
- **Consent line (exact copy):** "Dengan mengirim, Kakak setuju dihubungi tim Haraka Erfi." plus a link to `/privasi`.
- **Data retention:** anonymous conversation logs carry no personal data and are deleted after 90 days. Full transcripts are stored only with a lead.
- **Demo protection:** per-IP rate limit plus a per-session turn cap. No captcha.
- **WhatsApp CS (exact):** `0831-3703-0656`, link `https://wa.me/6283137030656`.

## Review Focus

1. **Browser without Web Speech (Firefox/Safari), or mic permission denied:** the mic button hides and typing still works. Test in Task 6.
2. **ElevenLabs fails or the quota is exhausted:** the answer text still shows and the avatar plays "speaking" for a short time, then returns to idle. No error wall. Tests in Task 4 and Task 6.
3. **Audio autoplay blocked before the first user gesture:** the greeting shows as text and no audio is attempted until the first click or keypress. Test in Task 6.
4. **Visitor speaks or types their phone number in chat instead of using the form:** the number is pre-filled into the lead form. Test in Task 7.
5. **Spam or a runaway session burning the free quota:** the 21st turn in a session or the 31st request per IP per minute returns 429 with a friendly Indonesian message. Test in Task 3.

---

## File Structure

```
app/
  layout.tsx, globals.css         page shell, tokens (Soft Skin palette, fonts)
  page.tsx                        composes Hero (facts, logo) + Conversation
  privasi/page.tsx                short privacy notice
  api/chat/route.ts               POST → LLM stream (text/plain)
  api/tts/route.ts                POST → audio/mpeg or 503
  api/lead/route.ts               POST → save lead, email sales
components/
  avatar/Avatar.tsx               <Avatar state audioLevel/> — picks a renderer
  avatar/PlaceholderAvatar.tsx    still image + CSS breathe/blink/ring per state
  avatar/ClipAvatar.tsx           <video> crossfade player from manifest
  avatar/clips.ts                 manifest types, parse, pickClip
  FactOrbs.tsx                    floating fact cards
  Conversation.tsx                line, chips, input bar, mic, lead form slot
  LeadForm.tsx                    name, WA, consent
lib/
  avatarState.ts                  state reducer
  knowledge/haraka.md             company facts (spec Appendix A, then brief)
  prompt.ts                       buildSystemPrompt()
  llm.ts                          streamChat() — OpenAI-compatible adapter
  rateLimit.ts                    checkLimit()
  tts.ts                          synthesize()
  speech.ts                       createRecognizer() wrapper over Web Speech
  controller.ts                   useConversation() hook
  lead.ts                         extractPhone(), LEAD_MARKER, stripMarker()
  supabase.ts                     server client (service role)
  notify.ts                       sendLeadEmail()
supabase/migrations/0001_init.sql tables + 90-day cleanup
public/avatar/placeholder.jpg     copy of REFERENSI MODEL/af2c11b6....jpg
public/avatar/manifest.json       {"mode":"placeholder"}
docs/avatar-clip-spec.md          what the owner must produce
tests/…                           mirrors lib/ and components/
```

---

### Task 1: Scaffold + Soft Skin page shell

**Files:**
- Create: Next.js app at the repo root (keep `REFERENSI*`, `docs/`), `vitest.config.ts`, `tests/setup.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `components/FactOrbs.tsx`, `.env.example`
- Test: `tests/components/FactOrbs.test.tsx`

**Interfaces:**
- Produces: `FactOrbs()` (no props). CSS tokens in `globals.css`: `--bg`, `--fg`, `--muted`, `--accent`, `--glass`, `--font-display` (serif, for the avatar line), `--font-body`.
- `.env.example` keys: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM`.

- [ ] **Step 1:** Run `npx create-next-app@15 . --ts --app --eslint --no-tailwind --src-dir=false --import-alias "@/*"`. When asked about existing files, keep them. Then `npm i -D vitest@3 @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`, and add `"test": "vitest run"` to `package.json`.
- [ ] **Step 2: Write the failing test** `FactOrbs renders the five company facts`. It asserts these texts are present: `18+`, `brand partner`, `6 tahap`, `Sejak 2015`, `CPKB · BPOM · HALAL`, `Skincare · Bodycare`.
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4:** Implement `FactOrbs` as absolutely positioned glass cards around a central stage. Implement `page.tsx`: logo "HARAKA ERFI" top-left, a stage with an avatar slot (an empty div for now), and a bottom stack slot. Set the palette from the mockup: background radial `#fbf6f5 → #f1e7e6 → #e6d8d8`, text `#3a2e2e`, accent `#c98b8b`. Add a `@media (max-width: 768px)` rule: orbs become a wrapping row under the avatar, no horizontal overflow.
- [ ] **Step 5:** Run `npm test` → PASS. Run `npm run build` → succeeds.
- [ ] **Step 6:** Commit `feat: scaffold Next.js app with Soft Skin page shell`.

### Task 2: Avatar component (state machine, placeholder, clip player)

**Files:**
- Create: `lib/avatarState.ts`, `components/avatar/{Avatar,PlaceholderAvatar,ClipAvatar}.tsx`, `components/avatar/clips.ts`, `public/avatar/placeholder.jpg`, `public/avatar/manifest.json`, `docs/avatar-clip-spec.md`
- Test: `tests/lib/avatarState.test.ts`, `tests/components/clips.test.ts`, `tests/components/Avatar.test.tsx`

**Interfaces:**
- Produces:
  - `type AvatarState = 'idle'|'listening'|'thinking'|'speaking'`
  - `type AvatarEvent = 'MIC_ON'|'TYPING'|'SUBMIT'|'AUDIO_START'|'AUDIO_END'|'TEXT_ONLY'|'CANCEL'`
  - `avatarReducer(s: AvatarState, e: AvatarEvent): AvatarState`
  - `<Avatar state={AvatarState} audioLevel={number 0..1} />`
  - `type ClipManifest = {mode:'placeholder'} | {mode:'clips', clips: Record<AvatarState, string[]>}`
  - `parseManifest(json: unknown): ClipManifest` (invalid → `{mode:'placeholder'}`)
  - `pickClip(list: string[], previous: string|null, rnd?: () => number): string` (never returns `previous` when `list.length > 1`)

- [ ] **Step 1: Write failing tests.**
  - Reducer:
    - `idle --MIC_ON→ listening`
    - `idle --TYPING→ listening`
    - `listening --SUBMIT→ thinking`
    - `thinking --AUDIO_START→ speaking`
    - `speaking --AUDIO_END→ idle`
    - `thinking --TEXT_ONLY→ speaking`
    - `any --CANCEL→ idle`
    - unknown pairs return the same state
  - Clips:
    - `parseManifest({mode:'clips', clips:{idle:['a.mp4'], …}})` round-trips
    - `parseManifest({mode:'clips'})` → placeholder
    - `pickClip(['a','b','c'],'a', () => 0)` ≠ `'a'`
  - Avatar:
    - `<Avatar state="listening" …/>` with a placeholder manifest renders `data-state="listening"` and an `img` whose src ends with `placeholder.jpg`
- [ ] **Step 2:** Run `npm test` → FAIL.
- [ ] **Step 3: Implement.**
  - `PlaceholderAvatar` copies the mockup's mask, 5 s breathe and pulse ring. Add a blink overlay: an eyelid-tone ellipse at the eye line, scaleY 0→1→0 for 120 ms every 3–6 s.
    - `listening`: ring visible, faster pulse.
    - `thinking`: slight 2° head tilt.
    - `speaking`: ring scale follows `audioLevel`.
    - Respect `prefers-reduced-motion`.
  - `ClipAvatar` keeps two stacked `<video muted playsInline>` elements and crossfades 250 ms on state change, using `pickClip` for the next clip. Idle and listening loop; a speaking clip that ends while still speaking picks the next variant.
  - `Avatar` fetches `/avatar/manifest.json` once and renders the matching renderer.
  - Copy `REFERENSI MODEL/af2c11b6cdcc068ca0bb4b179ba1ccbf.jpg` → `public/avatar/placeholder.jpg`.
- [ ] **Step 4:** Write `docs/avatar-clip-spec.md` (in Indonesian):
  - clips per state: idle ×2, listening ×1, thinking ×1, speaking ×3
  - 1080×1350 (4:5), MP4 H.264, 24–30 fps, no audio
  - idle and listening clips 4–8 s, seamless loop (first frame = last frame); speaking clips 3–5 s
  - head position and lighting identical across all clips, plain background `#efe6e5` or alpha WebM
  - subtle mouth movement only
  - file names `idle-1.mp4`…; how to switch `manifest.json` to `mode:"clips"`
- [ ] **Step 5:** Run `npm test` → PASS. Mount `<Avatar>` in `page.tsx` with a temporary state cycler that only exists behind `?debugAvatar=1`.
- [ ] **Step 6:** Commit `feat: swappable avatar with four states, placeholder and clip renderers`.

### Task 3: Knowledge, prompt, LLM route with limits

**Files:**
- Create: `lib/knowledge/haraka.md`, `lib/prompt.ts`, `lib/llm.ts`, `lib/rateLimit.ts`, `lib/lead.ts` (constants only here), `app/api/chat/route.ts`
- Test: `tests/lib/prompt.test.ts`, `tests/lib/rateLimit.test.ts`, `tests/api/chat.test.ts`

**Interfaces:**
- Produces:
  - `type ChatMessage = {role:'user'|'assistant', content:string}`
  - `buildSystemPrompt(knowledge: string): string`
  - `streamChat(messages: ChatMessage[], system: string): Promise<ReadableStream<Uint8Array>>` (POST `${LLM_BASE_URL}/chat/completions`, `stream:true`, OpenAI SSE → plain text chunks)
  - `checkLimit(key: string, max: number, windowMs: number, now?: number): boolean` (in-memory, fine for the demo)
  - `export const LEAD_MARKER = '[[LEAD]]'`
  - `POST /api/chat` body `{sessionId: string, messages: ChatMessage[]}` → `200 text/plain` stream, or `429 {error:string}`

- [ ] **Step 1:** Write `haraka.md` from spec Appendix A, verbatim facts in Indonesian. End it with a "Belum tersedia" section listing MOQ, harga, durasi and FAQ answers.
- [ ] **Step 2: Write failing tests.**
  - `buildSystemPrompt('X')` contains:
    - `X`
    - `Rara`
    - `Kak`
    - `jangan mengarang angka` (case-insensitive)
    - `[[LEAD]]`
    - `0831-3703-0656`
  - `checkLimit` allows 30 calls in 60 000 ms per key and refuses the 31st, and allows again after the window.
  - Chat route, with `fetch` mocked to return an SSE body with two deltas `"Halo "`, `"Kak"`:
    - a valid request streams `Halo Kak`;
    - `messages` with 41 entries (21st user turn) → 429 with error `Sesi demo ini sudah mencapai batas. Silakan lanjut via WhatsApp 0831-3703-0656.`;
    - the 31st request from the same `x-forwarded-for` within a minute → 429.
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: Implement.** The system prompt covers every rule in Global Constraints, and these:
  - Discovery questions (jenis produk, jumlah, budget, target launching).
  - When the visitor shows intent (asks price, MOQ or estimate, or after 3–4 exchanges), offer a free estimate/consultation and end that reply with `[[LEAD]]` on its own line, once per conversation.

  The route enforces the limits: max 20 user turns per `sessionId`, 30 requests/min per IP. It reads env `LLM_*`, default `LLM_MODEL` from env only, no hardcoded model.
- [ ] **Step 5:** Run → PASS.
- [ ] **Step 6:** Commit `feat: chat route with Haraka knowledge, persona rules and demo limits`.

### Task 4: TTS route

**Files:**
- Create: `lib/tts.ts`, `app/api/tts/route.ts`
- Test: `tests/api/tts.test.ts`

**Interfaces:**
- Produces:
  - `synthesize(text: string): Promise<ArrayBuffer>`. It POSTs `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_64` with header `xi-api-key` and body `{text, model_id: ELEVENLABS_MODEL}`. Default model `eleven_multilingual_v2` if env unset; verify it supports Indonesian at build time.
  - `POST /api/tts` body `{text: string}` → `200 audio/mpeg`, or `503 {error:'tts_unavailable'}`.

- [ ] **Step 1: Write failing tests.**
  - mocked 200 → response `content-type` is `audio/mpeg`
  - mocked 401/429/500 → 503 `tts_unavailable`
  - `text` longer than 600 chars → 400
  - `text` with `[[LEAD]]` → the marker is stripped before sending
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: ElevenLabs TTS route with graceful failure`.

### Task 5: Speech input wrapper

**Files:**
- Create: `lib/speech.ts`
- Test: `tests/lib/speech.test.ts`

**Interfaces:**
- Produces: `createRecognizer(opts: {lang: 'id-ID', onResult(text: string): void, onEnd(): void, onError(code: string): void}): {start(): void, stop(): void} | null`. Returns `null` when neither `window.SpeechRecognition` nor `window.webkitSpeechRecognition` exists.

- [ ] **Step 1: Write failing tests.**
  - no API on window → `null`
  - with a fake `webkitSpeechRecognition` class:
    - `start()` calls the fake's `start` with `lang==='id-ID'`
    - a final result event calls `onResult('berapa moq')`
    - an error event `not-allowed` calls `onError('not-allowed')`
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat: Web Speech recognizer wrapper`.

### Task 6: Conversation UI and controller — **Milestone: avatar demo**

**Files:**
- Create: `lib/controller.ts`, `components/Conversation.tsx`
- Modify: `app/page.tsx` (mount Conversation, wire avatar state, remove the debug cycler or keep it behind the flag)
- Test: `tests/lib/controller.test.tsx`, `tests/components/Conversation.test.tsx`

**Interfaces:**
- Consumes: `avatarReducer`, `createRecognizer`, `/api/chat`, `/api/tts`, `LEAD_MARKER`.
- Produces: `useConversation(): {state: AvatarState, audioLevel: number, line: string, messages: ChatMessage[], micSupported: boolean, showLeadForm: boolean, send(text: string): Promise<void>, startMic(): void, stopMic(): void, userGestured(): void}`

- [ ] **Step 1: Write failing tests** (mock `fetch`, `Audio`, `createRecognizer`).
  - **Initial state:** `line` = `Halo Kak, aku Rara. Ceritakan produk impianmu.` and no `fetch` to `/api/tts` before `userGestured()`.
  - **`send('berapa moq?')`:**
    - state passes through `thinking`;
    - the `line` streams to the full reply;
    - TTS is fetched once;
    - state goes `speaking` on audio play, then `idle` on audio end.
  - **TTS returns 503:** `line` still shows the full reply, state goes `speaking` then `idle` after `min(6000, 60 ms × reply length)` (fake timers).
  - **Lead marker:** a reply containing `[[LEAD]]` → `showLeadForm` true, the marker is not shown in `line`, and the TTS text has no marker.
  - **No mic support:** recognizer `null` → `micSupported` false, and `Conversation` renders no mic button.
  - **Chips:** clicking `Berapa MOQ?` calls `send('Berapa MOQ?')`.
  - **Rate limit:** chat 429 → `line` shows the 429 error text.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**
  - Get `audioLevel` from a Web Audio `AnalyserNode` RMS on the playing element.
  - `sessionId` = `crypto.randomUUID()` kept in `sessionStorage`.
  - Chips: `Berapa MOQ?`, `Bisa urus BPOM?`, `Berapa lama prosesnya?`.
  - The input bar sends on Enter, and typing fires `TYPING`.
  - Show a small "Suara oleh ElevenLabs" credit under the input (free-tier attribution).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Milestone check.**
  - Run `npm run dev`.
  - In Chrome, speak "berapa minimal order untuk serum?". Expected:
    - the avatar goes listening → thinking → speaking → idle;
    - the voice answers in Indonesian without inventing a number;
    - in Firefox the mic is hidden and typing works.
  - Deploy a Vercel preview with env set and send the URL to the owner for the boss demo before continuing.
- [ ] **Step 6:** Commit `feat: voice and text conversation driving the avatar`.

### Task 7: Lead capture, storage, email, privacy page

**Files:**
- Create: `components/LeadForm.tsx`, `lib/supabase.ts`, `lib/notify.ts`, `app/api/lead/route.ts`, `app/privasi/page.tsx`, `supabase/migrations/0001_init.sql`
- Modify: `lib/lead.ts`, `components/Conversation.tsx`, `lib/controller.ts`, `app/api/chat/route.ts`
- Test: `tests/lib/lead.test.ts`, `tests/api/lead.test.ts`, `tests/components/LeadForm.test.tsx`

**Interfaces:**
- Produces:
  - `extractPhone(texts: string[]): string | null`. Indonesian mobile numbers in the forms `08…`, `+628…` or `628…` with spaces or dashes allowed, 10–13 digits, normalised to `08…`. The latest message wins.
  - `<LeadForm defaultPhone={string|null} onSubmitted={() => void} />`. Fields: `nama` (required) and `whatsapp` (required, same validation), the consent line (exact copy) linking `/privasi`, and the button `Kirim`.
  - `POST /api/lead` body `{sessionId, name, whatsapp, messages: ChatMessage[]}` → `201 {ok:true}`, or `400 {error}`.
- Table `leads`: `id uuid pk default gen_random_uuid(), created_at timestamptz default now(), name text, whatsapp text, summary jsonb, transcript jsonb, session_id text`.
- Table `chat_logs`: `id, created_at, session_id, role text, content text`. It holds no name or number: the route redacts phone numbers to `[nomor]` before insert.
- Retention: a `pg_cron` daily job deletes `chat_logs` older than 90 days. If pg_cron is unavailable on the free tier, use a Vercel Cron hitting `/api/cleanup`.

- [ ] **Step 1: Write failing tests.**
  - **`extractPhone`:**
    - `['nomorku 0812-3456-7890']` → `081234567890`
    - `['+62 812 3456 7890']` → `081234567890`
    - `['harga 15000']` → `null`
  - **LeadForm:**
    - pre-fills `defaultPhone`;
    - blocks submit with an empty name;
    - shows the exact consent copy.
  - **Lead route** (mock Supabase, LLM and Resend):
    - inserts one `leads` row whose `summary` has keys `produk, jumlah, budget, launching` (from an LLM call asking for JSON, null when unknown);
    - sends one email to `LEAD_EMAIL_TO` with name, WA and summary;
    - an invalid WA → 400;
    - if email fails, the lead is still saved and `201` is returned.
- [ ] **Step 2:** FAIL → **Step 3:** implement. Also modify `app/api/chat/route.ts` (plus a test in `tests/api/chat.test.ts`): after the stream completes, insert the last user message and the full assistant reply into `chat_logs` with phone numbers redacted to `[nomor]`. A logging failure never breaks the response. After submit, Rara says `Terima kasih Kak {nama}! Tim kami akan menghubungi lewat WhatsApp.` and a `Chat WhatsApp sekarang` button links to `https://wa.me/6283137030656`. → **Step 4:** PASS.
- [ ] **Step 5:** Apply the migration to the Supabase project, submit one lead on the preview, and confirm the row and the email.
- [ ] **Step 6:** Commit `feat: lead capture with consent, Supabase storage and email notification`.

### Task 8: Phone-safe layout check and handover notes

**Files:**
- Modify: `app/globals.css`
- Create: `README.md` (setup, env, deploy, how to swap clips, how to update `haraka.md` from the brief)

- [ ] **Step 1:** Add the test `page has no horizontal overflow at 375px`. Render `page.tsx` in jsdom with `window.innerWidth=375` and assert that no element in `.stage` has the inline style `min-width` above 375. Also check manually in the browser preview at 375×812 with no horizontal scroll.
- [ ] **Step 2:** Write the README sections listed above.
- [ ] **Step 3:** Run `npm test && npm run build` → all pass.
- [ ] **Step 4:** Commit `docs: setup and handover README; phone-safe layout`.
