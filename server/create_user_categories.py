from database import SessionLocal
from data.seed_categories import seed_default_categories, create_sample_mappings, SYSTEM_CATEGORIES
from models.user import User
from models.category import Category

db = SessionLocal()

# Get all users
users = db.query(User).all()
print(f"Found {len(users)} users\n")

for user in users:
    print(f"Processing user: {user.email}")
    
    # Check how many categories they already have
    existing_cats = db.query(Category).filter(Category.user_id == user.id).count()
    print(f"  Already has {existing_cats} categories")
    
    if existing_cats == 1:  # Only has "Uncategorized"
        print("  Creating default categories...")
        
        # Manually create categories for this user from SYSTEM_CATEGORIES
        for cat_data in SYSTEM_CATEGORIES:
            # Check if category already exists
            existing = db.query(Category).filter(
                Category.user_id == user.id,
                Category.name == cat_data["name"]
            ).first()
            
            if not existing:
                category = Category(
                    user_id=user.id,
                    **cat_data,
                    is_system=False  # User-owned, not system
                )
                db.add(category)
        
        db.commit()
        
        # Get refreshed category count
        final_count = db.query(Category).filter(Category.user_id == user.id).count()
        print(f"  Created categories: {existing_cats} -> {final_count}")
        
        # Create sample mappings
        print("  Creating sample mappings...")
        mappings = create_sample_mappings(db, user.id)
        print(f"  Created {len(mappings)} sample mappings")
    else:
        print("  Skipping (has more than just Uncategorized)")

db.close()
print("\nDone!")
