"""render job status downloaded + download_filename

Revision ID: 978f56350fa0
Revises: faa1838ad659
Create Date: 2026-11-03 12:29:28.882540
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = '978f56350fa0'
down_revision: str | None = 'faa1838ad659'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_WITH = "status IN ('queued', 'claimed', 'uploading_ref', 'generating', 'downloading', 'downloaded', 'done', 'failed')"
_WITHOUT = "status IN ('queued', 'claimed', 'uploading_ref', 'generating', 'downloading', 'done', 'failed')"


def upgrade() -> None:
    op.add_column('render_jobs', sa.Column('download_filename', sa.String(length=255), nullable=True))
    op.drop_constraint('status_valid', 'render_jobs', type_='check')
    op.create_check_constraint('status_valid', 'render_jobs', _WITH)


def downgrade() -> None:
    op.execute("UPDATE render_jobs SET status = 'downloading' WHERE status = 'downloaded'")
    op.drop_constraint('status_valid', 'render_jobs', type_='check')
    op.create_check_constraint('status_valid', 'render_jobs', _WITHOUT)
    op.drop_column('render_jobs', 'download_filename')
