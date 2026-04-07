from database import SessionLocal
from data.seed_categories import create_system_categories, seed_default_categories, create_sample_mappings
from models.user import User

db = SessionLocal()

# Create system categories
print("Creating system categories...")
categories = create_system_categories(db)
print(f"Created {len(categories)} system categories")

# Get all users and seed their categories
users = db.query(User).all()
print(f"\nFound {len(users)} users")

for user in users:
    print(f"\nSeeding categories for user: {user.email}")
    user_cats = seed_default_categories(db, user.id)
    print(f"  Created {len(user_cats)} user categories")
    
    if user_cats:  # Only create mappings if we created categories
        mappings = create_sample_mappings(db, user.id)
        print(f"  Created {len(mappings)} sample mappings")

db.close()
print("\nDone!")
