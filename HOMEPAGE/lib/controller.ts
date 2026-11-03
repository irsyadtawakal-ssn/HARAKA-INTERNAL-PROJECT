"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { avatarReducer, type AvatarEvent, type AvatarState } from "./avatarState";
import { createRecognizer } from "./speech";
import { extractPhone, LEAD_MARKER, stripMarker } from "./lead";
import { getSessionId } from "./session";
import type { ChatMessage } from "./llm";

export const GREETING = "Halo Kak, aku Rara. Ceritakan produk impianmu.";
const NETWORK_ERROR = "Maaf Kak, koneksinya terputus. Coba kirim lagi ya.";

type Voice = { audio: HTMLAudioElement; analyser: AnalyserNode | null };

export function useConversation() {
  const [state, dispatch] = useReducer(avatarReducer, "idle" as AvatarState);
  const [line, setLine] = useState(GREETING);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micSupported, setMicSupported] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const messagesRef = useRef<ChatMessage[]>([]);
  const leadDoneRef = useRef(false);
  const micActiveRef = useRef(false);
  // Each send or mic press starts a new turn; anything an older turn finishes later is dropped.
  const turn = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const voice = useRef<Voice | null>(null);
  const audioUrl = useRef<string | null>(null);
  const textTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelFrame = useRef<number | null>(null);
  const recognizer = useRef<ReturnType<typeof createRecognizer>>(null);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});

  const fire = useCallback((e: AvatarEvent) => dispatch(e), []);

  const stopLevel = useCallback(() => {
    if (levelFrame.current) cancelAnimationFrame(levelFrame.current);
    levelFrame.current = null;
    setAudioLevel(0);
  }, []);

  const startLevel = useCallback(() => {
    const analyser = voice.current?.analyser;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      setAudioLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
      levelFrame.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  /** Ends whatever the previous turn was doing and returns the new turn's id. */
  const newTurn = useCallback(() => {
    abort.current?.abort();
    abort.current = new AbortController();
    voice.current?.audio.pause();
    if (textTimer.current) clearTimeout(textTimer.current);
    stopLevel();
    return ++turn.current;
  }, [stopLevel]);

  // Browsers only allow audio after a user gesture: create and unlock one element and one context then, and reuse them.
  const userGestured = useCallback(() => {
    if (voice.current) {
      void (voice.current.analyser?.context as AudioContext | undefined)?.resume?.();
      return;
    }
    const audio = new Audio();
    let analyser: AnalyserNode | null = null;
    try {
      const ctx = new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);
      void ctx.resume();
    } catch {
      analyser = null; // No Web Audio: the ring simply stays still.
    }
    audio.onplay = () => { fire("AUDIO_START"); startLevel(); };
    audio.onended = () => { stopLevel(); fire("AUDIO_END"); };
    voice.current = { audio, analyser };
  }, [fire, startLevel, stopLevel]);

  const speakAsText = useCallback((text: string) => {
    if (textTimer.current) clearTimeout(textTimer.current);
    fire("TEXT_ONLY");
    textTimer.current = setTimeout(() => fire("AUDIO_END"), Math.min(6000, 60 * text.length));
  }, [fire]);

  const speak = useCallback(async (text: string, id: number) => {
    const v = voice.current;
    if (!v) return speakAsText(text);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abort.current?.signal,
      });
      if (id !== turn.current) return;
      if (!res.ok) return speakAsText(text);
      const blob = await res.blob();
      if (id !== turn.current) return;
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = URL.createObjectURL(blob);
      v.audio.src = audioUrl.current;
      await v.audio.play();
    } catch {
      if (id === turn.current) speakAsText(text);
    }
  }, [speakAsText]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const id = newTurn();
    fire("CANCEL");
    fire("SUBMIT");

    const history: ChatMessage[] = [...messagesRef.current, { role: "user", content: text }];
    messagesRef.current = history;
    setMessages(history);

    const fail = (message: string) => {
      if (id !== turn.current) return;
      setLine(message);
      fire("CANCEL");
    };

    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), messages: history }),
        signal: abort.current?.signal,
      });
      if (id !== turn.current) return;
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        return fail(err?.error ?? NETWORK_ERROR);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (id !== turn.current) return;
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setLine(stripMarker(full));
      }
    } catch {
      return fail(NETWORK_ERROR);
    }

    const reply = stripMarker(full);
    if (!reply) return fail(NETWORK_ERROR);
    setLine(reply);
    if (full.includes(LEAD_MARKER) && !leadDoneRef.current) setShowLeadForm(true);
    messagesRef.current = [...messagesRef.current, { role: "assistant", content: reply }];
    setMessages(messagesRef.current);
    await speak(reply, id);
  }, [fire, newTurn, speak]);
  sendRef.current = send;

  const setMic = useCallback((on: boolean) => {
    micActiveRef.current = on;
    setMicActive(on);
  }, []);

  useEffect(() => {
    recognizer.current = createRecognizer({
      lang: "id-ID",
      onResult: (t) => void sendRef.current(t),
      onEnd: () => {
        setMic(false);
        fire("MIC_OFF");
      },
      onError: (code) => {
        if (code === "not-allowed" || code === "service-not-allowed") setMicSupported(false);
        setMic(false);
        fire("MIC_OFF");
      },
    });
    setMicSupported(recognizer.current !== null);
    return () => {
      abort.current?.abort();
      voice.current?.audio.pause();
      if (textTimer.current) clearTimeout(textTimer.current);
      if (levelFrame.current) cancelAnimationFrame(levelFrame.current);
    };
  }, [fire, setMic]);

  const startMic = useCallback(() => {
    userGestured();
    newTurn();
    fire("CANCEL");
    fire("MIC_ON");
    try {
      recognizer.current?.start();
      setMic(true);
    } catch {
      setMic(false); // already listening, or the browser refused
    }
  }, [fire, newTurn, setMic, userGestured]);

  const stopMic = useCallback(() => recognizer.current?.stop(), []);

  const typing = useCallback((active: boolean) => {
    if (active) fire("TYPING");
    else if (!micActiveRef.current) fire("MIC_OFF");
  }, [fire]);

  const leadSubmitted = useCallback((name: string) => {
    leadDoneRef.current = true;
    setLeadDone(true);
    setShowLeadForm(false);
    const thanks = `Terima kasih Kak ${name}! Tim kami akan menghubungi lewat WhatsApp.`;
    const id = newTurn();
    setLine(thanks);
    fire("CANCEL");
    fire("SUBMIT");
    void speak(thanks, id);
  }, [fire, newTurn, speak]);

  const chatPhone = extractPhone(messages.filter((m) => m.role === "user").map((m) => m.content));

  return {
    state, audioLevel, line, messages, micSupported, micActive, showLeadForm, leadDone, chatPhone,
    send, startMic, stopMic, userGestured, typing, leadSubmitted,
  };
}
