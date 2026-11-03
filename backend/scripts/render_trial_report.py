"""Laporan uji coba render Google Flow per hari (WIB): klaim, selesai, gagal permanen, alasan gagal per percobaan,
dan median menit dari klaim sampai selesai. Dipakai untuk memutuskan render tetap di VPS atau pindah ke mini PC
(spec §4.2).

    uv run python -m scripts.render_trial_report --since 2026-11-01
"""

import argparse
import statistics
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_sessionmaker
from app.models import AuditLog, RenderJob
from app.render import WIB

ACTIONS = ("render_job.claimed", "render_job.attempt_failed", "render_job.done")


@dataclass
class DayRow:
    day: date
    claims: int = 0
    done: int = 0
    failed: int = 0
    failures: dict[str, int] = field(default_factory=dict)
    median_minutes_to_done: float | None = None


def _reason_label(reason: str) -> str:
    # Alasan lease habis memuat angka menit; disatukan supaya bisa dihitung.
    if reason.startswith("Tidak ada kabar dari extension"):
        return "lease habis"
    if "mengklaim ulang" in reason:
        return "klaim ulang"
    return reason[:60]


def build_report(db: Session, since: date) -> list[DayRow]:
    start = datetime(since.year, since.month, since.day, tzinfo=WIB)
    logs = db.scalars(
        select(AuditLog).where(AuditLog.action.in_(ACTIONS), AuditLog.at >= start).order_by(AuditLog.at)
    ).all()
    rows: dict[date, DayRow] = {}
    reasons: dict[date, Counter] = defaultdict(Counter)
    durations: dict[date, list[float]] = defaultdict(list)
    last_claim: dict[str, datetime] = {}

    for log in logs:
        day = log.at.astimezone(WIB).date()
        row = rows.setdefault(day, DayRow(day=day))
        if log.action == "render_job.claimed":
            row.claims += 1
            last_claim[log.entity_id] = log.at
        elif log.action == "render_job.attempt_failed":
            after = log.after or {}
            reasons[day][_reason_label(str(after.get("reason", "")))] += 1
            if after.get("status") == "failed":
                row.failed += 1
        else:
            row.done += 1
            claimed_at = last_claim.get(log.entity_id)
            if claimed_at is None:
                job = db.get(RenderJob, uuid.UUID(log.entity_id))
                claimed_at = job.claimed_at if job else None
            if claimed_at is not None:
                durations[day].append((log.at - claimed_at).total_seconds() / 60)

    for day, row in rows.items():
        row.failures = dict(reasons[day])
        if durations[day]:
            row.median_minutes_to_done = round(statistics.median(durations[day]), 1)
    return [rows[d] for d in sorted(rows)]


def format_report(rows: list[DayRow]) -> str:
    if not rows:
        return "Belum ada aktivitas render pada rentang ini."
    lines = []
    for r in rows:
        fails = ", ".join(f"{k}={v}" for k, v in sorted(r.failures.items())) or "-"
        median = f"{r.median_minutes_to_done} mnt" if r.median_minutes_to_done is not None else "-"
        lines.append(
            f"{r.day.isoformat()}  klaim={r.claims}  selesai={r.done}  gagal_permanen={r.failed}  "
            f"median_klaim_sampai_selesai={median}  alasan_gagal: {fails}"
        )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--since", type=date.fromisoformat, required=True, help="Tanggal awal (YYYY-MM-DD, WIB)")
    args = parser.parse_args()
    with get_sessionmaker()() as db:
        print(format_report(build_report(db, args.since)))


if __name__ == "__main__":
    main()
