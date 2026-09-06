import os
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.database import SessionLocal, engine, Base
from app.models import (
    User, UserRole, Case, CaseStatus, CaseClassification, CaseAssignment,
    Document, DocType, DocumentVersion, VersionStatus, AuditEvent, AuditOutcome,
    Signature, LedgerTransaction, ShareRequest, SharePermission, ShareStatus
)
from app.encryption import encrypt_bytes
from app.crypto_service import get_or_create_user_rsa_keypair, sign_hash_with_rsa
from app.ledger_service import record_ledger_event
from app.verification_service import generate_verification_code
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

STORAGE_BASE = Path(__file__).resolve().parent / "storage"

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def seed_database():
    print("=" * 60)
    print("🌱 Seeding SIH Demo Data for SecureCase DMS...")
    print("=" * 60)

    db = SessionLocal()
    try:
        # 1. Seed Users
        users_def = [
            ("Officer Raj Kumar", "raj.kumar@securecase.gov.in", "Cyber Crime Cell", UserRole.officer),
            ("Dr. Priya Sharma", "priya.sharma@securecase.gov.in", "Forensics Lab", UserRole.forensic),
            ("Adv. Meera Patel", "meera.patel@securecase.gov.in", "Legal Division", UserRole.legal),
            ("Admin Vikram Singh", "vikram.singh@securecase.gov.in", "IT Administration", UserRole.admin),
            ("Inspector Rajesh Verma", "rajesh.verma@securecase.gov.in", "Special Investigation Unit", UserRole.investigator),
            ("Senior Analyst Ananya Roy", "ananya.roy@securecase.gov.in", "Cyber Crime Cell", UserRole.investigator),
        ]

        users_by_email = {}
        for name, email, dept, role in users_def:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                user = User(
                    full_name=name,
                    email=email,
                    department=dept,
                    role=role,
                    password_hash=get_password_hash("SecureCase@2026"),
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"  + User created: {name} ({role.value})")
            users_by_email[email] = user

        raj = users_by_email["raj.kumar@securecase.gov.in"]
        priya = users_by_email["priya.sharma@securecase.gov.in"]
        meera = users_by_email["meera.patel@securecase.gov.in"]
        rajesh = users_by_email["rajesh.verma@securecase.gov.in"]
        ananya = users_by_email["ananya.roy@securecase.gov.in"]

        # 2. Seed Cases (Primary Problem Statement Case: C-2026-00124)
        c124 = db.query(Case).filter(Case.case_number == "C-2026-00124").first()
        if not c124:
            c124 = Case(
                case_number="C-2026-00124",
                title="Operation CyberShield: Multi-Vector Financial Data Breach & Ransomware Intrusion",
                case_type="Cybercrime & Financial Fraud",
                status=CaseStatus.under_investigation,
                classification=CaseClassification.confidential,
                created_by=raj.id,
            )
            db.add(c124)
            db.commit()
            db.refresh(c124)
            print(f"  + Primary Case Created: {c124.case_number} - {c124.title}")

        c089 = db.query(Case).filter(Case.case_number == "C-2026-00089").first()
        if not c089:
            c089 = Case(
                case_number="C-2026-00089",
                title="State vs. Apex Corp Ransomware Incident",
                case_type="Corporate Cyber Extortion",
                status=CaseStatus.open,
                classification=CaseClassification.restricted,
                created_by=rajesh.id,
            )
            db.add(c089)
            db.commit()
            db.refresh(c089)
            print(f"  + Secondary Case Created: {c089.case_number}")

        # 3. Seed Case Assignments
        assignments_def = [
            (c124.id, raj.id, "Lead Cyber Investigating Officer"),
            (c124.id, priya.id, "Chief Forensic Examiner"),
            (c124.id, meera.id, "Special Public Prosecutor / Legal Counsel"),
            (c124.id, rajesh.id, "Field Officer"),
            (c124.id, ananya.id, "Data & Network Analyst"),
        ]
        for cid, uid, a_role in assignments_def:
            exists = db.query(CaseAssignment).filter(CaseAssignment.case_id == cid, CaseAssignment.user_id == uid).first()
            if not exists:
                db.add(CaseAssignment(case_id=cid, user_id=uid, assigned_role=a_role))
        db.commit()

        # 4. Seed Documents for C-2026-00124 (FIR, 8 Witness Statements, 3 Forensic Reports, Evidence Photos, Charge Sheet)
        documents_spec = [
            # 1 FIR
            ("FIR-2026-00124: Initial First Information Report on Cyber Intrusions", DocType.FIR, "restricted", raj.id,
             "First Information Report filed under IT Act Section 66C and 66D. Unauthorized server access detected on 2026-08-15."),

            # 8 Witness Statements
            ("Witness Statement #1 - Suresh Kumar (Head of IT Infrastructure)", DocType.witness_statement, "confidential", rajesh.id,
             "Statement of Suresh Kumar: Noticed anomalous outbound connections on primary database server at 03:14 AM."),
            ("Witness Statement #2 - Anita Rao (Chief Financial Officer)", DocType.witness_statement, "confidential", meera.id,
             "Statement of Anita Rao: Confirmed fraudulent wire transfer authorization attempt of 1.2 Crore INR on 2026-08-16."),
            ("Witness Statement #3 - Karan Mehta (Senior Systems Auditor)", DocType.witness_statement, "internal", ananya.id,
             "Statement of Karan Mehta: Discovered privilege escalation exploit scripts executed via compromised admin credentials."),
            ("Witness Statement #4 - David Miller (Network Operations Lead)", DocType.witness_statement, "confidential", rajesh.id,
             "Statement of David Miller: Observed C2 beaconing traffic directed to external bulletproof hosting IP ranges."),
            ("Witness Statement #5 - Ramesh Chand (Facility Security In-Charge)", DocType.witness_statement, "internal", rajesh.id,
             "Statement of Ramesh Chand: Verified physical access logs to server room B-4. No physical breach detected."),
            ("Witness Statement #6 - Vikash Sharma (SOC Shift Lead)", DocType.witness_statement, "confidential", ananya.id,
             "Statement of Vikash Sharma: SIEM alerts triggered for multiple failed SSH brute-force attempts from internal subnet."),
            ("Witness Statement #7 - Pooja Verma (Database Administrator)", DocType.witness_statement, "confidential", priya.id,
             "Statement of Pooja Verma: Export logs indicate SQL dump command executed against customer PII table."),
            ("Witness Statement #8 - Amit Shah (Third-Party Security Consultant)", DocType.witness_statement, "restricted", raj.id,
             "Statement of Amit Shah: Pen-testing audit confirmed unpatched vulnerability CVE-2026-8812 was exploited."),

            # 3 Forensic Reports
            ("Forensic Report #1 - Server Memory RAM & Volatile Artifact Analysis", DocType.forensic_report, "confidential", priya.id,
             "Volatile memory dump analysis via Volatility 3 framework. Extracted malicious DLL injection payload in lsass.exe process."),
            ("Forensic Report #2 - EnCase Bit-Stream Hard Drive Integrity Report", DocType.forensic_report, "restricted", priya.id,
             "Physical disk image clone verified against original SHA-256 hash. Recovered deleted Cobalt Strike beacon artifacts."),
            ("Forensic Report #3 - Malware Reverse Engineering & Cryptographic Payload Breakdown", DocType.forensic_report, "confidential", priya.id,
             "Reverse engineering of malware sample 'RansomShield.exe'. RSA-2048 encryption key exchange mechanism identified."),

            # Evidence Media
            ("Evidence Photo - Tamper-Evident Physical Server Seal Verification", DocType.evidence_media, "internal", rajesh.id,
             "High-resolution photograph of intact tamper seal on Primary Domain Controller server rack."),
            ("Evidence Photo - Recovered Unauthorized Rogue USB Flash Drive", DocType.evidence_media, "confidential", priya.id,
             "Photograph of physical rogue USB Rubber Ducky device seized from workstation WS-104."),

            # Charge Sheet
            ("Final Section 66C/66D IT Act Consolidated Charge Sheet", DocType.charge_sheet, "restricted", raj.id,
             "Consolidated charge sheet detailing charges under IT Act 2000 Sections 66C, 66D, 43 and IPC Sections 420, 120B."),
        ]

        now = datetime.now(timezone.utc)

        for idx, (title, dtype, sens, creator_id, text_content) in enumerate(documents_spec, 1):
            doc = db.query(Document).filter(Document.title == title, Document.case_id == c124.id).first()
            if not doc:
                doc = Document(
                    case_id=c124.id,
                    doc_type=dtype,
                    title=title,
                    sensitivity=sens,
                    created_by=creator_id,
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)

                # Write physical mock file & create DocumentVersion
                doc_storage_dir = STORAGE_BASE / str(c124.id) / str(doc.id)
                doc_storage_dir.mkdir(parents=True, exist_ok=True)

                raw_bytes = f"OFFICIAL SECURECASE EVIDENCE RECORD\n\nTitle: {title}\nCase: {c124.case_number}\nClassification: {sens}\nContent: {text_content}\nTimestamp: {now.isoformat()}".encode('utf-8')
                file_hash = compute_sha256(raw_bytes)
                encrypted_bytes = encrypt_bytes(raw_bytes)

                enc_file_path = doc_storage_dir / "v1.enc"
                with open(enc_file_path, "wb") as f:
                    f.write(encrypted_bytes)

                ver = DocumentVersion(
                    document_id=doc.id,
                    version_number=1,
                    storage_path=str(enc_file_path),
                    file_hash=file_hash,
                    mime_type="application/pdf" if dtype != DocType.evidence_media else "image/png",
                    size_bytes=len(raw_bytes),
                    uploaded_by=creator_id,
                    status=VersionStatus.approved,
                    extracted_text=text_content,
                    verification_code=generate_verification_code(),
                )
                db.add(ver)
                db.commit()
                db.refresh(ver)

                # Special case: Add revision v2 for Forensic Report #1
                if "Memory RAM" in title:
                    v2_bytes = raw_bytes + b"\n\n[REVISION V2]: Appended YARA rule definitions for memory scanning."
                    v2_hash = compute_sha256(v2_bytes)
                    v2_enc_path = doc_storage_dir / "v2.enc"
                    with open(v2_enc_path, "wb") as f:
                        f.write(encrypt_bytes(v2_bytes))

                    ver.status = VersionStatus.superseded
                    v2_ver = DocumentVersion(
                        document_id=doc.id,
                        version_number=2,
                        storage_path=str(v2_enc_path),
                        file_hash=v2_hash,
                        mime_type="application/pdf",
                        size_bytes=len(v2_bytes),
                        uploaded_by=priya.id,
                        status=VersionStatus.approved,
                        extracted_text=text_content + " YARA memory scanning rules updated.",
                        verification_code=generate_verification_code(),
                    )
                    db.add(v2_ver)
                    db.commit()
                    db.refresh(v2_ver)

                # Sign Charge Sheet with RSA Keypair
                if dtype == DocType.charge_sheet:
                    priv_pem, pub_pem = get_or_create_user_rsa_keypair(db, raj)
                    sig_val = sign_hash_with_rsa(priv_pem, ver.file_hash)
                    sig = Signature(
                        document_version_id=ver.id,
                        signer_id=raj.id,
                        signature_value=sig_val,
                        certificate_ref="CERT-RSA2048-SECURECASE-GOV-IN",
                    )
                    db.add(sig)
                    db.commit()
                    print(f"  + RSA-2048 Signed Document Version #{ver.id} by Officer Raj")

                # Record Ledger Event
                record_ledger_event(
                    db=db,
                    document_version_id=ver.id,
                    data_hash=ver.file_hash,
                    event_type="document_uploaded",
                    actor_id=creator_id,
                )

                # Seed 2-3 Audit Log Entries per Document
                log_time_1 = now - timedelta(hours=(idx * 2) + 5)
                log_time_2 = now - timedelta(hours=(idx * 2) + 2)

                audit_1 = AuditEvent(
                    actor_id=creator_id,
                    action="UPLOAD_DOCUMENT",
                    resource_type="document",
                    resource_id=doc.id,
                    outcome=AuditOutcome.success,
                    ip_address="192.168.1.104",
                    timestamp=log_time_1,
                )
                audit_2 = AuditEvent(
                    actor_id=priya.id if creator_id != priya.id else raj.id,
                    action="DOWNLOAD_DOCUMENT_VERSION",
                    resource_type="document_version",
                    resource_id=ver.id,
                    outcome=AuditOutcome.success,
                    ip_address="192.168.1.112",
                    timestamp=log_time_2,
                )
                db.add(audit_1)
                db.add(audit_2)
                db.commit()

        print(f"  + Successfully seeded {len(documents_spec)} documents for Case C-2026-00124.")

        # 5. Seed Additional Realistic Audit Log Events (Failed logins, access denied attempts for security dashboard showcase)
        audit_security_events = [
            (priya.id, "mfa-verify", "auth", priya.id, AuditOutcome.success, "192.168.1.112", now - timedelta(hours=3)),
            (meera.id, "login", "auth", meera.id, AuditOutcome.success, "192.168.1.125", now - timedelta(hours=4)),
            (ananya.id, "login-failed", "auth", ananya.id, AuditOutcome.denied, "185.220.101.5", now - timedelta(hours=1)),
            (ananya.id, "login-failed", "auth", ananya.id, AuditOutcome.denied, "185.220.101.5", now - timedelta(hours=1, minutes=2)),
            (ananya.id, "login-failed", "auth", ananya.id, AuditOutcome.denied, "185.220.101.5", now - timedelta(hours=1, minutes=4)),
            (ananya.id, "DOWNLOAD_DOCUMENT_VERSION", "document_version", 1, AuditOutcome.denied, "192.168.1.130", now - timedelta(minutes=45)),
        ]
        for uid, act, rtype, rid, outcome, ip, ts in audit_security_events:
            db.add(AuditEvent(
                actor_id=uid,
                action=act,
                resource_type=rtype,
                resource_id=rid,
                outcome=outcome,
                ip_address=ip,
                timestamp=ts,
            ))
        db.commit()

        # 6. Seed Active Share Requests
        charge_sheet_doc = db.query(Document).filter(Document.doc_type == DocType.charge_sheet).first()
        if charge_sheet_doc:
            share = db.query(ShareRequest).filter(ShareRequest.document_id == charge_sheet_doc.id).first()
            if not share:
                db.add(ShareRequest(
                    case_id=c124.id,
                    document_id=charge_sheet_doc.id,
                    sender_id=raj.id,
                    recipient_id=meera.id,
                    permission_level=SharePermission.download,
                    expires_at=now + timedelta(days=7),
                    status=ShareStatus.accepted,
                ))
                db.commit()
                print("  + Active Share Created: Officer Raj shared Charge Sheet with Adv. Meera Patel")

        # 7. Backfill missing verification codes for existing versions
        unversioned_versions = db.query(DocumentVersion).filter(DocumentVersion.verification_code.is_(None)).all()
        for u_ver in unversioned_versions:
            u_ver.verification_code = generate_verification_code()
        if unversioned_versions:
            db.commit()
            print(f"  + Backfilled verification codes for {len(unversioned_versions)} document versions.")

        print("=" * 60)
        print("✅ SIH Demo Seeding Completed Successfully!")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
