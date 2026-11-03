type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};

export type RecognizerOptions = {
  lang: "id-ID";
  onResult(text: string): void;
  onEnd(): void;
  onError(code: string): void;
};

/** Thin wrapper over the browser Web Speech API. Returns null where it is unsupported. */
export function createRecognizer(opts: RecognizerOptions): { start(): void; stop(): void } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = opts.lang;
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) {
        const text = r[0].transcript.trim();
        if (text) opts.onResult(text);
      }
    }
  };
  rec.onend = () => opts.onEnd();
  rec.onerror = (e) => opts.onError(e.error);

  return { start: () => rec.start(), stop: () => rec.stop() };
}
