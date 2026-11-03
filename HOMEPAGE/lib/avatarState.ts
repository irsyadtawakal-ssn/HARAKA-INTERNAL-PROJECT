export type AvatarState = "idle" | "listening" | "thinking" | "speaking";
export type AvatarEvent = "MIC_ON" | "MIC_OFF" | "TYPING" | "SUBMIT" | "AUDIO_START" | "AUDIO_END" | "TEXT_ONLY" | "CANCEL";

const TRANSITIONS: Partial<Record<AvatarState, Partial<Record<AvatarEvent, AvatarState>>>> = {
  idle: { MIC_ON: "listening", TYPING: "listening", SUBMIT: "thinking" },
  listening: { SUBMIT: "thinking", MIC_OFF: "idle" },
  thinking: { AUDIO_START: "speaking", TEXT_ONLY: "speaking" },
  speaking: { AUDIO_END: "idle" },
};

export function avatarReducer(state: AvatarState, event: AvatarEvent): AvatarState {
  if (event === "CANCEL") return "idle";
  return TRANSITIONS[state]?.[event] ?? state;
}
