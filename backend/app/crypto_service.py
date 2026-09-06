import base64
from typing import Tuple
from sqlalchemy.orm import Session

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

from app.models import User
from app.encryption import encrypt_bytes, decrypt_bytes

def get_or_create_user_rsa_keypair(db: Session, user: User) -> Tuple[bytes, str]:
    """
    Returns (private_key_pem_bytes, public_key_pem_str).
    Generates an RSA-2048 keypair on first use, encrypting private key with Fernet before saving to DB.
    """
    if user.rsa_private_key_enc and user.rsa_public_key:
        encrypted_priv_bytes = user.rsa_private_key_enc.encode()
        decrypted_priv_bytes = decrypt_bytes(encrypted_priv_bytes)
        return decrypted_priv_bytes, user.rsa_public_key

    # Generate new RSA-2048 keypair
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode('utf-8')

    # Encrypt private key with Fernet
    encrypted_priv_bytes = encrypt_bytes(private_pem)

    user.rsa_private_key_enc = encrypted_priv_bytes.decode('utf-8')
    user.rsa_public_key = public_pem
    db.commit()

    return private_pem, public_pem


def sign_hash_with_rsa(private_pem: bytes, file_hash_str: str) -> str:
    """
    Signs the document's SHA-256 hash using the officer's RSA private key.
    Returns base64-encoded signature.
    """
    private_key = serialization.load_pem_private_key(private_pem, password=None)
    signature_bytes = private_key.sign(
        file_hash_str.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    return base64.b64encode(signature_bytes).decode('utf-8')


def verify_rsa_signature(public_pem_str: str, file_hash_str: str, signature_b64: str) -> bool:
    """
    Verifies base64 RSA signature against file_hash_str using public key.
    Returns True if valid, False if invalid.
    """
    try:
        public_key = serialization.load_pem_public_key(public_pem_str.encode('utf-8'))
        sig_bytes = base64.b64decode(signature_b64)
        public_key.verify(
            sig_bytes,
            file_hash_str.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False
