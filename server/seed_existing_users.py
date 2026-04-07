"""
Seed categories for existing users who don't have them.

This script:
1. Finds all users who don't have any categories
2. Creates system categories (if needed)
3. Copies system categories to each user
4. Creates sample category mappings for each user

Usage:
  # Local development:
  docker-compose exec backend python seed_existing_users.py
  
  # Or run inside container:
  python seed_existing_users.py
"""

import logging
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.user import User
from models.category import Category
from data.seed_categories import create_system_categories, seed_all

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def seed_existing_users():
    """
    Seed categories for all existing users who don't have any.
    """
    db = SessionLocal()
    
    try:
        # Get all users
        all_users = db.query(User).all()
        logger.info(f"Found {len(all_users)} total users")
        
        if not all_users:
            logger.info("No users found in database")
            return
        
        # Ensure system categories exist
        logger.info("Creating/verifying system categories...")
        system_cats = create_system_categories(db)
        logger.info(f"System categories ready ({len(system_cats)} new, rest already existed)")
        
        # Find users without categories
        users_without_categories = []
        for user in all_users:
            user_cat_count = db.query(Category).filter(
                Category.user_id == user.id,
            ).count()
            
            if user_cat_count == 0:
                users_without_categories.append(user)
                logger.info(f"  User {user.email} has 0 categories")
            else:
                logger.info(f"  User {user.email} already has {user_cat_count} categories")
        
        if not users_without_categories:
            logger.info("✓ All users already have categories!")
            return
        
        logger.info(f"\nSeeding {len(users_without_categories)} users without categories...")
        
        # Seed each user without categories
        seeded_count = 0
        for user in users_without_categories:
            try:
                result = seed_all(db, user.id)
                logger.info(
                    f"✓ Seeded {user.email}: "
                    f"{result['categories_created']} categories, "
                    f"{result['mappings_created']} mappings"
                )
                seeded_count += 1
            except Exception as e:
                logger.error(f"✗ Failed to seed {user.email}: {e}", exc_info=True)
        
        logger.info(f"\n✓ Successfully seeded {seeded_count}/{len(users_without_categories)} users")
        
    finally:
        db.close()


if __name__ == "__main__":
    seed_existing_users()
