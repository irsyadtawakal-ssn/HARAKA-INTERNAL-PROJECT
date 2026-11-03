import pytest

from app.content import writer
from app.models import AssetAnalysis, Claim

TH_PROMPT = 'Medium close-up vertical 9:16 of a woman. She says: "{line}"'


def _analysis() -> AssetAnalysis:
    return AssetAnalysis(footage_type="person", hook_3s="Mau bikin brand?", key_message="Maklon skincare MOQ 1.000 pcs", tags=["skincare"], quality={})


def _slot(slot: str, mode: str, **kw) -> dict:
    prompt = TH_PROMPT.format(line=f"Dialog {slot}") if mode == "talking_head" else f"Slow dolly over serum bottles, {slot}"
    return {"slot": slot, "dialog": f"Dialog {slot}" if mode == "talking_head" else None, "overlay_text": f"Teks {slot}", "flow_prompt": prompt, **kw}


def _reply(slots: list[str], mode: str = "talking_head") -> dict:
    return {"headline": "Brand skincare sendiri", "caption": "Yuk konsultasi", "slots": [_slot(s, mode) for s in slots]}


ADS = ["hook1", "hook2", "hook3", "body", "cta"]
HARD = ["hook1", "hook2", "hook3", "cta"]


def _write(db, content_type="talking_head", mode="talking_head", **kw):
    return writer.write_script(db, content_type=content_type, funnel="A", analysis=_analysis(), mode=mode, claims=kw.pop("claims", []), **kw)


def test_ads_menghasilkan_5_slot(db, fake_llm):
    fake_llm.reply("writer", _reply(ADS, "broll"))
    draft = _write(db, "video_ads", "broll")
    assert [s.slot for s in draft.slots] == ADS


def test_hard_sell_4_slot_tanpa_body(db, fake_llm):
    fake_llm.reply("writer", _reply(ADS, "broll"))
    fake_llm.reply("writer", _reply(ADS, "broll"))
    with pytest.raises(writer.WriterError):
        _write(db, "hard_sell", "broll")
    fake_llm.reply("writer", _reply(HARD, "broll"))
    assert [s.slot for s in _write(db, "hard_sell", "broll").slots] == HARD


def test_json_rusak_dicoba_sekali_lagi(db, fake_llm):
    fake_llm.reply("writer", "maaf, saya tidak bisa")
    fake_llm.reply("writer", _reply(ADS))
    assert len(_write(db).slots) == 5
    assert len(fake_llm.calls) == 2
    assert "tidak valid" in fake_llm.calls[1]["messages"][-1]["content"]


def test_dua_kali_rusak_gagal(db, fake_llm):
    fake_llm.reply("writer", "bukan json")
    fake_llm.reply("writer", {"headline": "x"})
    with pytest.raises(writer.WriterError):
        _write(db)
    assert len(fake_llm.calls) == 2


def test_talking_head_tanpa_tanda_kutip_memicu_ulang(db, fake_llm):
    bad = _reply(ADS)
    bad["slots"][0]["flow_prompt"] = "A woman talks to camera"
    fake_llm.reply("writer", bad)
    fake_llm.reply("writer", _reply(ADS))
    assert len(_write(db).slots) == 5 and len(fake_llm.calls) == 2
    assert "tanda kutip" in fake_llm.calls[1]["messages"][-1]["content"]


def test_slot_duplikat_ditolak(db, fake_llm):
    dup = _reply(ADS)
    dup["slots"][1]["slot"] = "hook1"
    fake_llm.reply("writer", dup)
    fake_llm.reply("writer", dup)
    with pytest.raises(writer.WriterError):
        _write(db)


def test_forbid_new_claims_masuk_prompt_dan_klaim_terdaftar_tampil(db, fake_llm):
    claim = Claim(category="moq", text="MOQ 1.000 pcs", status="approved")
    db.add(claim)
    db.commit()
    fake_llm.reply("writer", _reply(ADS))
    _write(db, claims=[claim], forbid_new_claims=True)
    system = fake_llm.calls[0]["messages"][0]["content"]
    assert "di luar daftar" in system and f"{claim.id}: MOQ 1.000 pcs" in system


def test_dialog_harus_sama_dengan_kutipan_prompt(db, fake_llm):
    bad = _reply(ADS)
    bad["slots"][0]["flow_prompt"] = TH_PROMPT.format(line="Bersertifikat BPOM dijamin putih")
    fake_llm.reply("writer", bad)
    fake_llm.reply("writer", _reply(ADS))
    assert len(_write(db).slots) == 5 and len(fake_llm.calls) == 2
    assert "dialog" in fake_llm.calls[1]["messages"][-1]["content"]
