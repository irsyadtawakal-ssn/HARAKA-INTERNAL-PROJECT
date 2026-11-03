import json

import httpx
import pytest
from sqlalchemy import select

from app import llm
from app.models import AgentRun, GuardrailSetting

MODELS = {"analysis_model": "m-analisis", "writer_model": "m-writer"}


@pytest.fixture
def configured(monkeypatch, db):
    base = llm.get_settings.__wrapped__()
    monkeypatch.setattr(llm, "get_settings", lambda: base.model_copy(update={"llm_base_url": "http://llm.test/v1", "llm_api_key": "k"}))
    db.merge(GuardrailSetting(key=llm.SETTING_KEY, value=MODELS))
    db.commit()


def _transport(handler):
    return httpx.MockTransport(handler)


def _ok(content: str):
    body = {"choices": [{"message": {"content": content}}], "usage": {"prompt_tokens": 10, "completion_tokens": 5}}
    return lambda request: httpx.Response(200, json=body)


def test_setting_model_hanya_owner(client, as_role):
    assert client.put("/settings/content-llm", headers=as_role("marketing"), json=MODELS).status_code == 403
    owner = as_role("owner")
    assert client.put("/settings/content-llm", headers=owner, json=MODELS).status_code == 200
    assert client.get("/settings/content-llm", headers=owner).json() == MODELS


def test_complete_mencatat_agent_run(configured, db, monkeypatch):
    monkeypatch.setattr(llm, "_transport", _transport(_ok('```json\n{"a": 1}\n```')))
    assert llm.complete(db, agent="content_writer", slot="writer", messages=[{"role": "user", "content": "x"}]) == {"a": 1}
    run = db.scalar(select(AgentRun))
    assert (run.status, run.tokens_in, run.tokens_out, run.model, run.agent) == ("succeeded", 10, 5, "m-writer", "content_writer")


def test_balasan_sse_tetap_terbaca(configured, db, monkeypatch):
    sse = "".join(f"data: {json.dumps({'choices': [{'delta': {'content': p}}]})}\n\n" for p in ('{"a"', ": 2}")) + "data: [DONE]\n\n"
    monkeypatch.setattr(llm, "_transport", _transport(lambda r: httpx.Response(200, text=sse)))
    assert llm.complete(db, agent="content_writer", slot="writer", messages=[]) == {"a": 2}


def test_llm_belum_dikonfigurasi(db, monkeypatch):
    base = llm.get_settings.__wrapped__()
    monkeypatch.setattr(llm, "get_settings", lambda: base.model_copy(update={"llm_base_url": "", "llm_api_key": ""}))
    with pytest.raises(llm.LLMError, match="belum dikonfigurasi"):
        llm.complete(db, agent="content_writer", slot="writer", messages=[])
    assert db.scalar(select(AgentRun)).status == "failed"


def test_model_belum_dipilih(configured, db):
    db.merge(GuardrailSetting(key=llm.SETTING_KEY, value={"analysis_model": "", "writer_model": ""}))
    db.commit()
    with pytest.raises(llm.LLMError, match="model"):
        llm.complete(db, agent="content_writer", slot="writer", messages=[])


def test_endpoint_mati_dan_status_galat(configured, db, monkeypatch):
    def down(request):
        raise httpx.ConnectError("refused")

    monkeypatch.setattr(llm, "_transport", _transport(down))
    with pytest.raises(llm.LLMError, match="tidak bisa dihubungi"):
        llm.complete(db, agent="content_writer", slot="writer", messages=[])
    monkeypatch.setattr(llm, "_transport", _transport(lambda r: httpx.Response(429, text="slow down")))
    with pytest.raises(llm.LLMError, match="429"):
        llm.complete(db, agent="content_writer", slot="writer", messages=[])


def test_balasan_bukan_json(configured, db, monkeypatch):
    monkeypatch.setattr(llm, "_transport", _transport(_ok("maaf, saya tidak bisa")))
    with pytest.raises(llm.LLMFormatError):
        llm.complete(db, agent="content_writer", slot="writer", messages=[])
