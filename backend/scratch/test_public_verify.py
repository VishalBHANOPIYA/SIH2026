import sys, os
sys.path.insert(0, os.path.abspath("."))
import requests
from app.database import SessionLocal
from app.models import DocumentVersion

db = SessionLocal()
version = db.query(DocumentVersion).filter(DocumentVersion.verification_code.isnot(None)).first()
db.close()

print(f"Testing with verification code: {version.verification_code}")

# 1. Test GET /public/verify
res = requests.get(f"http://localhost:8000/public/verify?code={version.verification_code}")
print("Status Code:", res.status_code)
print("Response JSON:")
print(res.json())

# 2. Test GET /public/verify with invalid code
res_invalid = requests.get("http://localhost:8000/public/verify?code=INVALID_123")
print("\nInvalid Code Status Code:", res_invalid.status_code)
print("Invalid Response JSON:")
print(res_invalid.json())

# 3. Test GET /public/verify/qr/{code}
res_qr = requests.get(f"http://localhost:8000/public/verify/qr/{version.verification_code}")
print("\nQR Code Status Code:", res_qr.status_code)
print("QR Content-Type:", res_qr.headers.get("content-type"))
print("QR Bytes Length:", len(res_qr.content))
