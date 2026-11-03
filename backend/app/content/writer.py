"""Writer (spec §3.2-3.3, §4.1): script 3 hook + body/CTA + prompt Flow, divalidasi sebelum dipakai."""

import re
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app import llm
from app.models import AssetAnalysis, Claim
from app.render import normalize_job_fields

WRITER_PROMPT_VERSION = "writer-v1"
HOOKS = ["hook1", "hook2", "hook3"]
SLOTS_BY_TYPE = {
    "video_ads": [*HOOKS, "body", "cta"],
    "talking_head": [*HOOKS, "body", "cta"],
    "hard_sell": [*HOOKS, "cta"],
}
DURATION_BY_TYPE = {"video_ads": 30, "talking_head": 30, "hard_sell": 15}
TYPE_BRIEF = {
    "video_ads": "Video Ads 30 dtk: hook -> B-roll produk/pabrik -> CTA, teks overlay kuat.",
    "talking_head": "Talking Head 30 dtk: orang di foto berbicara (hook, body, CTA). Dialog Indonesia.",
    "hard_sell": "Hard Sell maks 15 dtk: tawaran/promo langsung, MOQ, CTA WhatsApp besar.",
}


class WriterError(Exception):
    pass


class SlotDraft(BaseModel):
    slot: Literal["hook1", "hook2", "hook3", "body", "cta"]
    dialog: str | None = None
    overlay_text: str
    flow_prompt: str
    target_duration: Literal["4s", "6s", "8s", "10s"] | None = None
    claim_ids: list[str] = Field(default_factory=list)
    new_claims: list[str] = Field(default_factory=list)


class ScriptDraft(BaseModel):
    headline: str
    caption: str
    slots: list[SlotDraft]


def flow_slot(mode: str, slot: str) -> str:
    """Slot render_jobs: mode broll selalu 'broll'; talking head memakai hook/body/cta."""
    return "broll" if mode == "broll" else ("hook" if slot.startswith("hook") else slot)


def _system_prompt(content_type: str, funnel: str, mode: str, claims: list[Claim], forbid_new_claims: bool) -> str:
    claim_lines = "\n".join(f"- {c.id}: {c.text}" for c in claims) or "(belum ada klaim terdaftar)"
    rules = [
        "Kamu penulis iklan maklon skincare Haraka Erfi. Balas HANYA JSON.",
        f"Tipe: {TYPE_BRIEF[content_type]} Funnel {funnel}.",
        f"Slot wajib persis: {', '.join(SLOTS_BY_TYPE[content_type])} (3 variasi hook, body dan CTA dipakai bersama).",
        "Setiap flow_prompt berbahasa Inggris untuk Google Flow (Veo), vertikal 9:16.",
        'Mode talking_head: isi "dialog" (Indonesia) dan sertakan dialog yang sama dalam tanda kutip di flow_prompt, mis. She says: "...".'
        if mode == "talking_head"
        else 'Mode broll: tanpa dialog dan tanpa tanda kutip di flow_prompt; isi "target_duration" (4s/6s/8s/10s).',
        "Hanya boleh menyebut klaim dari daftar di bawah. Isi claim_ids dengan id klaim yang dipakai slot itu; "
        "klaim lain yang kamu perlukan tulis di new_claims (teks apa adanya).",
        'Bentuk JSON: {"headline", "caption", "slots": [{"slot", "dialog", "overlay_text", "flow_prompt", "target_duration", "claim_ids", "new_claims"}]}',
        f"Daftar klaim terdaftar:\n{claim_lines}",
    ]
    if forbid_new_claims:
        rules.append("DILARANG menulis klaim apa pun di luar daftar klaim terdaftar: new_claims harus kosong di semua slot.")
    return "\n".join(rules)


def _validate(raw, content_type: str, mode: str) -> ScriptDraft:
    try:
        draft = ScriptDraft.model_validate(raw)
    except ValidationError as e:
        raise ValueError(f"struktur JSON tidak sesuai: {e.errors()[0]['loc']} {e.errors()[0]['msg']}") from e
    expected = SLOTS_BY_TYPE[content_type]
    if sorted(s.slot for s in draft.slots) != sorted(expected):
        raise ValueError(f"slot harus persis {expected}, bukan {[s.slot for s in draft.slots]}")
    draft.slots.sort(key=lambda s: expected.index(s.slot))
    for s in draft.slots:
        if mode == "talking_head" and not (s.dialog and s.dialog.strip()):
            raise ValueError(f"slot {s.slot} butuh dialog")
        if mode == "talking_head":
            quoted = re.findall(r'"([^"]+)"', s.flow_prompt)
            if any(q.strip() != s.dialog.strip() for q in quoted):
                raise ValueError(f"slot {s.slot}: kalimat dalam tanda kutip di flow_prompt harus sama persis dengan dialog")
        try:
            s.target_duration = normalize_job_fields(mode, flow_slot(mode, s.slot), s.flow_prompt, s.target_duration)
        except HTTPException as e:
            raise ValueError(f"slot {s.slot}: {e.detail}") from e
    return draft


def write_script(
    db: Session,
    *,
    content_type: str,
    funnel: str,
    analysis: AssetAnalysis,
    mode: str,
    claims: list[Claim],
    forbid_new_claims: bool = False,
) -> ScriptDraft:
    brief = (
        f"Hasil analisis referensi: jenis={analysis.footage_type}; hook_3s={analysis.hook_3s}; "
        f"pesan utama={analysis.key_message}; tag={analysis.tags}; transkrip={analysis.transcript or '-'}"
    )
    messages = [
        {"role": "system", "content": _system_prompt(content_type, funnel, mode, claims, forbid_new_claims)},
        {"role": "user", "content": brief},
    ]
    problem = ""
    for attempt in range(2):
        try:
            raw = llm.complete(db, agent="content_writer", slot="writer", messages=messages, prompt_version=WRITER_PROMPT_VERSION)
            return _validate(raw, content_type, mode)
        except llm.LLMFormatError as e:
            problem = e.message
        except ValueError as e:
            problem = str(e)
        if attempt == 0:
            messages = [
                *messages,
                {"role": "user", "content": f"Balasan sebelumnya tidak valid: {problem}. Perbaiki dan balas HANYA JSON yang sesuai."},
            ]
    raise WriterError(f"Writer tidak menghasilkan script yang valid setelah dua percobaan: {problem}")
