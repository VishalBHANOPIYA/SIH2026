import base64
import hashlib
from cryptography.fernet import Fernet
from app.config import settings

def get_fernet_key() -> bytes:
    key_str = getattr(settings, 'FERNET_KEY', None)
    if key_str:
        try:
            Fernet(key_str.encode())
            return key_str.encode()
        except Exception:
            pass
    # Derive 32 url-safe base64 bytes from JWT_SECRET
    digest = hashlib.sha256(settings.JWT_SECRET.encode()).digest()
    return base64.urlsafe_b64encode(digest)

def encrypt_bytes(raw_bytes: bytes) -> bytes:
    key = get_fernet_key()
    fernet = Fernet(key)
    return fernet.encrypt(raw_bytes)

def decrypt_bytes(encrypted_bytes: bytes) -> bytes:
    key = get_fernet_key()
    fernet = Fernet(key)
    return fernet.decrypt(encrypted_bytes)
