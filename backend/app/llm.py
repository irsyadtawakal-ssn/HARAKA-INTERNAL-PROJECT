"""Satu-satunya jalur HTTP ke LLM (endpoint OpenAI-compatible) + pencatatan agent_runs (spec §4.1)."""

import json
import re
import time
from pathlib import Path
from typing import Literal

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AgentRun, GuardrailSetting

SETTING_KEY = "content_llm"
Slot = Literal["analysis", "writer"]
# Diganti tes dengan httpx.MockTransport.
_transport: httpx.BaseTransport | None = None
_FENCE = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.S)


class LLMError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class LLMFormatError(LLMError):
    """Balasan sampai, tetapi bukan JSON yang bisa dibaca."""


def get_models(db: Session) -> dict[str, str]:
    setting = db.get(GuardrailSetting, SETTING_KEY)
    value = setting.value if setting and isinstance(setting.value, dict) else {}
    return {"analysis_model": value.get("analysis_model") or "", "writer_model": value.get("writer_model") or ""}


def _read_body(response: httpx.Response) -> tuple[str, dict]:
    """Balasan JSON biasa, atau SSE (sebagian model membalas begitu walau stream=false)."""
    text = response.text.strip()
    if text.startswith("data:"):
        parts: list[str] = []
        for line in text.splitlines():
            line = line.strip()
            if not line.startswith("data:") or line.endswith("[DONE]"):
                continue
            chunk = json.loads(line[5:])
            choice = (chunk.get("choices") or [{}])[0]
            parts.append((choice.get("delta") or choice.get("message") or {}).get("content") or "")
        return "".join(parts), {}
    body = response.json()
    return body["choices"][0]["message"]["content"] or "", body.get("usage") or {}


def _chat(base_url: str, api_key: str, model: str, messages: list[dict]) -> tuple[str, dict]:
    try:
        with httpx.Client(transport=_transport, timeout=180) as client:
            response = client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": model, "messages": messages, "stream": False},
            )
    except httpx.HTTPError as e:
        raise LLMError(f"LLM tidak bisa dihubungi: {e}") from e
    if response.status_code >= 400:
        raise LLMError(f"LLM membalas {response.status_code}: {response.text[:200]}")
    try:
        return _read_body(response)
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise LLMError(f"Balasan LLM tidak dikenali: {e}") from e


def complete(
    db: Session, *, agent: str, slot: Slot, messages: list[dict], expect_json: bool = True, prompt_version: str | None = None
) -> dict | list | str:
    """Panggil model slot `slot`; selalu meninggalkan satu baris agent_runs (berhasil maupun gagal)."""
    settings = get_settings()
    model = get_models(db)[f"{slot}_model"]
    run = AgentRun(agent=agent, model=model or None, prompt_version=prompt_version, input_refs={"slot": slot}, status="running")
    db.add(run)
    db.flush()
    started = time.monotonic()
    try:
        if not settings.llm_base_url or not settings.llm_api_key:
            raise LLMError("LLM belum dikonfigurasi: isi LLM_BASE_URL dan LLM_API_KEY di backend/.env.")
        if not model:
            raise LLMError(f"Model LLM untuk {slot} belum dipilih. Isi di pengaturan model konten.")
        text, usage = _chat(settings.llm_base_url, settings.llm_api_key, model, messages)
        run.tokens_in, run.tokens_out = usage.get("prompt_tokens"), usage.get("completion_tokens")
        result: dict | list | str = text
        if expect_json:
            raw = text.strip()
            fenced = _FENCE.match(raw)
            try:
                result = json.loads(fenced.group(1) if fenced else raw)
            except ValueError as e:
                raise LLMFormatError(f"LLM tidak membalas JSON yang valid: {raw[:120]!r}") from e
        run.status = "succeeded"
        db.info["last_agent_run_id"] = run.id
        run.output = result if isinstance(result, dict) else {"result": result}
        return result
    except LLMError as e:
        run.status, run.error = "failed", e.message
        raise
    finally:
        run.duration_ms = int((time.monotonic() - started) * 1000)
        db.flush()


def transcribe(db: Session, path: Path) -> str | None:
    """Transkrip audio lewat /audio/transcriptions. Opsional: tanpa LLM_TRANSCRIBE_MODEL atau saat gagal -> None."""
    settings = get_settings()
    if not (settings.llm_transcribe_model and settings.llm_base_url and settings.llm_api_key):
        return None
    try:
        with httpx.Client(transport=_transport, timeout=300) as client, path.open("rb") as f:
            response = client.post(
                f"{settings.llm_base_url.rstrip('/')}/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                data={"model": settings.llm_transcribe_model},
                files={"file": (path.name, f)},
            )
        response.raise_for_status()
        return (response.json().get("text") or "").strip() or None
    except (httpx.HTTPError, ValueError):
        return None
