"""add verification code to document version

Revision ID: c9e4f5a6b7c8
Revises: b7f3e2c1d8a0
Create Date: 2026-09-06 23:49:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c9e4f5a6b7c8'
down_revision = '2b350578cef1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('document_versions', sa.Column('verification_code', sa.String(length=32), nullable=True))
    op.create_index(op.f('ix_document_versions_verification_code'), 'document_versions', ['verification_code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_document_versions_verification_code'), table_name='document_versions')
    op.drop_column('document_versions', 'verification_code')
