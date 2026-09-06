import secrets

def generate_verification_code() -> str:
    """Generate a 12-character alphanumeric verification code prefixed with VER-"""
    return f"VER-{secrets.token_hex(6).upper()}"
