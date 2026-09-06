from app.database import SessionLocal, engine, Base
from app.models import User, UserRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def seed_users():
    db = SessionLocal()
    try:
        users_data = [
            {
                "full_name": "Officer Raj Kumar",
                "email": "raj.kumar@securecase.gov.in",
                "department": "Cyber Crime Cell",
                "role": UserRole.officer,
                "password_hash": get_password_hash("SecureCase@2026")
            },
            {
                "full_name": "Dr. Priya Sharma",
                "email": "priya.sharma@securecase.gov.in",
                "department": "Forensics Lab",
                "role": UserRole.forensic,
                "password_hash": get_password_hash("SecureCase@2026")
            },
            {
                "full_name": "Adv. Meera Patel",
                "email": "meera.patel@securecase.gov.in",
                "department": "Legal Division",
                "role": UserRole.legal,
                "password_hash": get_password_hash("SecureCase@2026")
            },
            {
                "full_name": "Admin Vikram Singh",
                "email": "vikram.singh@securecase.gov.in",
                "department": "IT Administration",
                "role": UserRole.admin,
                "password_hash": get_password_hash("SecureCase@2026")
            }
        ]

        added = 0
        for data in users_data:
            existing = db.query(User).filter(User.email == data["email"]).first()
            if not existing:
                new_user = User(**data)
                db.add(new_user)
                added += 1
            else:
                print(f"User {data['email']} already exists.")

        if added > 0:
            db.commit()
            print(f"Successfully seeded {added} users.")
        else:
            print("No new users to seed.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting seed script...")
    # Base.metadata.create_all(bind=engine)  # You should use Alembic instead
    seed_users()
    print("Seeding complete.")
