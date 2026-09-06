"""initial_schema

Revision ID: aadeb1ab946f
Revises:
Create Date: 2026-09-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'aadeb1ab946f'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------- Enum type names ----------
user_role_enum = sa.Enum(
    'officer', 'investigator', 'forensic', 'legal', 'admin',
    name='user_role_enum'
)
case_status_enum = sa.Enum(
    'open', 'under_investigation', 'closed', 'archived',
    name='case_status_enum'
)
case_classification_enum = sa.Enum(
    'confidential', 'restricted', 'internal',
    name='case_classification_enum'
)
doc_type_enum = sa.Enum(
    'FIR', 'witness_statement', 'charge_sheet', 'forensic_report',
    'evidence_media', 'court_filing', 'legal_notice', 'judgment',
    name='doc_type_enum'
)
version_status_enum = sa.Enum(
    'draft', 'approved', 'superseded',
    name='version_status_enum'
)
permission_action_enum = sa.Enum(
    'view', 'download', 'share', 'approve',
    name='permission_action_enum'
)
audit_outcome_enum = sa.Enum(
    'success', 'denied',
    name='audit_outcome_enum'
)
share_permission_enum = sa.Enum(
    'view_only', 'download',
    name='share_permission_enum'
)
share_status_enum = sa.Enum(
    'pending', 'accepted', 'rejected', 'expired',
    name='share_status_enum'
)


def upgrade() -> None:
    # ── users ──
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('full_name', sa.String(120), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(256), nullable=False),
        sa.Column('department', sa.String(80), nullable=True),
        sa.Column('role', user_role_enum, nullable=False),
        sa.Column('mfa_secret', sa.String(64), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # ── cases ──
    op.create_table(
        'cases',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('case_number', sa.String(30), nullable=False),
        sa.Column('title', sa.String(256), nullable=False),
        sa.Column('case_type', sa.String(80), nullable=False),
        sa.Column('status', case_status_enum, nullable=False),
        sa.Column('classification', case_classification_enum, nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('case_number'),
    )
    op.create_index('ix_cases_case_number', 'cases', ['case_number'])

    # ── case_assignments ──
    op.create_table(
        'case_assignments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('case_id', sa.Integer(), sa.ForeignKey('cases.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('assigned_role', sa.String(60), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ── documents ──
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('case_id', sa.Integer(), sa.ForeignKey('cases.id'), nullable=False),
        sa.Column('doc_type', doc_type_enum, nullable=False),
        sa.Column('title', sa.String(256), nullable=False),
        sa.Column('sensitivity', sa.String(40), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ── document_versions ──
    op.create_table(
        'document_versions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('document_id', sa.Integer(), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('storage_path', sa.String(512), nullable=False),
        sa.Column('file_hash', sa.String(64), nullable=False),
        sa.Column('mime_type', sa.String(128), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('status', version_status_enum, nullable=False),
    )

    # ── permissions ──
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('subject_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('subject_department', sa.String(80), nullable=True),
        sa.Column('resource_type', sa.String(40), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('action', permission_action_enum, nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ── audit_events ──
    op.create_table(
        'audit_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('action', sa.String(80), nullable=False),
        sa.Column('resource_type', sa.String(40), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('outcome', audit_outcome_enum, nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_audit_events_timestamp', 'audit_events', ['timestamp'])

    # ── signatures ──
    op.create_table(
        'signatures',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('document_version_id', sa.Integer(), sa.ForeignKey('document_versions.id'), nullable=False),
        sa.Column('signer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('signature_value', sa.Text(), nullable=False),
        sa.Column('certificate_ref', sa.String(256), nullable=True),
        sa.Column('signed_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # ── ledger_transactions ──
    op.create_table(
        'ledger_transactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('document_version_id', sa.Integer(), sa.ForeignKey('document_versions.id'), nullable=False),
        sa.Column('data_hash', sa.String(64), nullable=False),
        sa.Column('prev_hash', sa.String(64), nullable=True),
        sa.Column('chain_hash', sa.String(64), nullable=False),
        sa.Column('event_type', sa.String(40), nullable=False),
        sa.Column('actor_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_ledger_transactions_chain_hash', 'ledger_transactions', ['chain_hash'])

    # ── share_requests ──
    op.create_table(
        'share_requests',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('sender_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('recipient_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('permission_level', share_permission_enum, nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('status', share_status_enum, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('share_requests')
    op.drop_table('ledger_transactions')
    op.drop_table('signatures')
    op.drop_table('audit_events')
    op.drop_table('permissions')
    op.drop_table('document_versions')
    op.drop_table('documents')
    op.drop_table('case_assignments')
    op.drop_table('cases')
    op.drop_table('users')

    # Drop enum types
    share_status_enum.drop(op.get_bind(), checkfirst=True)
    share_permission_enum.drop(op.get_bind(), checkfirst=True)
    audit_outcome_enum.drop(op.get_bind(), checkfirst=True)
    permission_action_enum.drop(op.get_bind(), checkfirst=True)
    version_status_enum.drop(op.get_bind(), checkfirst=True)
    doc_type_enum.drop(op.get_bind(), checkfirst=True)
    case_classification_enum.drop(op.get_bind(), checkfirst=True)
    case_status_enum.drop(op.get_bind(), checkfirst=True)
    user_role_enum.drop(op.get_bind(), checkfirst=True)
