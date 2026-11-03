"""content jobs + content_slot di render_jobs

Revision ID: c0a7e1d4b2f6
Revises: 978f56350fa0
Create Date: 2026-11-03 14:10:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = 'c0a7e1d4b2f6'
down_revision: str | None = '978f56350fa0'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('content_jobs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('type', sa.String(length=20), nullable=False),
    sa.Column('funnel', sa.String(length=4), nullable=False),
    sa.Column('reference_asset_id', sa.UUID(), nullable=False),
    sa.Column('start_asset_id', sa.UUID(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('script_id', sa.UUID(), nullable=True),
    sa.Column('pending_script_id', sa.UUID(), nullable=True),
    sa.Column('claim_approval_id', sa.UUID(), nullable=True),
    sa.Column('requested_by_id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("type IN ('video_ads', 'talking_head', 'hard_sell')", name='type_valid'),
    sa.CheckConstraint("funnel IN ('A', 'B')", name='funnel_valid'),
    sa.CheckConstraint("status IN ('queued', 'analyzing', 'writing', 'rendering', 'failed')", name='status_valid'),
    sa.ForeignKeyConstraint(['claim_approval_id'], ['approvals.id'], ),
    sa.ForeignKeyConstraint(['pending_script_id'], ['scripts.id'], ),
    sa.ForeignKeyConstraint(['reference_asset_id'], ['assets.id'], ),
    sa.ForeignKeyConstraint(['requested_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['script_id'], ['scripts.id'], ),
    sa.ForeignKeyConstraint(['start_asset_id'], ['assets.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('render_jobs', sa.Column('content_job_id', sa.UUID(), nullable=True))
    op.add_column('render_jobs', sa.Column('content_slot', sa.String(length=10), nullable=True))
    op.create_foreign_key('render_jobs_content_job_id_fkey', 'render_jobs', 'content_jobs', ['content_job_id'], ['id'])
    op.create_check_constraint(
        'content_slot_valid', 'render_jobs',
        "content_slot IS NULL OR content_slot IN ('hook1', 'hook2', 'hook3', 'body', 'cta')",
    )


def downgrade() -> None:
    op.drop_constraint('content_slot_valid', 'render_jobs', type_='check')
    op.drop_constraint('render_jobs_content_job_id_fkey', 'render_jobs', type_='foreignkey')
    op.drop_column('render_jobs', 'content_slot')
    op.drop_column('render_jobs', 'content_job_id')
    op.drop_table('content_jobs')
