"""
Seed default categories and category mappings.

Creates system categories and default classification rules.
"""

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from models.category import Category, CategoryType
from models.category_mapping import CategoryMapping

logger = logging.getLogger(__name__)

# System categories to create
SYSTEM_CATEGORIES = [
    {
        "name": "Uncategorized",
        "category_type": CategoryType.NEEDS,
        "icon": "question-circle",
        "color": "#808080",
        "description": "Transactions that need manual categorization",
    },
    {
        "name": "Salary",
        "category_type": CategoryType.INCOME,
        "icon": "briefcase",
        "color": "#28a745",
        "description": "Income from employment",
    },
    {
        "name": "Rent",
        "category_type": CategoryType.NEEDS,
        "icon": "home",
        "color": "#17a2b8",
        "description": "Rent and housing payments",
    },
    {
        "name": "Groceries",
        "category_type": CategoryType.NEEDS,
        "icon": "cart",
        "color": "#ffc107",
        "description": "Grocery shopping",
    },
    {
        "name": "Utilities",
        "category_type": CategoryType.NEEDS,
        "icon": "lightning",
        "color": "#007bff",
        "description": "Electricity, water, gas, internet",
    },
    {
        "name": "Transportation",
        "category_type": CategoryType.NEEDS,
        "icon": "car",
        "color": "#6c757d",
        "description": "Fuel, public transport, taxi",
    },
    {
        "name": "Healthcare",
        "category_type": CategoryType.NEEDS,
        "icon": "heart",
        "color": "#dc3545",
        "description": "Medical expenses, insurance",
    },
    {
        "name": "Dining Out",
        "category_type": CategoryType.WANTS,
        "icon": "utensils",
        "color": "#e83e8c",
        "description": "Restaurants, cafes, delivery",
    },
    {
        "name": "Entertainment",
        "category_type": CategoryType.WANTS,
        "icon": "film",
        "color": "#6610f2",
        "description": "Movies, games, streaming",
    },
    {
        "name": "Shopping",
        "category_type": CategoryType.WANTS,
        "icon": "shopping-bag",
        "color": "#fd7e14",
        "description": "Clothing, accessories, electronics",
    },
    {
        "name": "Travel",
        "category_type": CategoryType.WANTS,
        "icon": "plane",
        "color": "#20c997",
        "description": "Vacation, hotels, flights",
    },
    {
        "name": "Investments",
        "category_type": CategoryType.SAVINGS,
        "icon": "chart-line",
        "color": "#007bff",
        "description": "Stocks, mutual funds, FD",
    },
    {
        "name": "Savings",
        "category_type": CategoryType.SAVINGS,
        "icon": "piggy-bank",
        "color": "#28a745",
        "description": "Savings account deposits",
    },
    {
        "name": "Bank Transfer",
        "category_type": CategoryType.TRANSFER,
        "icon": "exchange-alt",
        "color": "#6c757d",
        "description": "Transfers between accounts",
    },
    {
        "name": "Credit Card Payment",
        "category_type": CategoryType.TRANSFER,
        "icon": "credit-card",
        "color": "#17a2b8",
        "description": "Credit card bill payments",
    },
]


def create_system_categories(db: Session) -> list[Category]:
    """
    Create system categories if they don't exist.
    
    Args:
        db: Database session
    
    Returns:
        List of created/found system categories
    """
    categories = []
    
    for cat_data in SYSTEM_CATEGORIES:
        # Check if category already exists
        existing = (
            db.query(Category)
            .filter(Category.name == cat_data["name"], Category.is_system == True)  # noqa: E712
            .first()
        )
        
        if not existing:
            category = Category(
                user_id=None,  # System categories don't belong to a user
                is_system=True,
                is_active=True,  # Explicitly set to active
                **cat_data,
            )
            db.add(category)
            categories.append(category)
            logger.info(f"Created system category: {cat_data['name']}")
    
    if categories:
        db.commit()
        for cat in categories:
            db.refresh(cat)
    
    return categories


def seed_default_categories(db: Session, user_id: UUID) -> list[Category]:
    """
    Seed default categories for a new user.
    
    Creates a copy of system categories for the user.
    
    Args:
        db: Database session
        user_id: User UUID
    
    Returns:
        List of created categories
    """
    # Get system categories
    system_categories = (
        db.query(Category)
        .filter(Category.is_system == True)  # noqa: E712
        .all()
    )
    
    categories = []
    
    for sys_cat in system_categories:
        # Check if user already has this category
        existing = (
            db.query(Category)
            .filter(
                Category.user_id == user_id,
                Category.name == sys_cat.name,
            )
            .first()
        )
        
        if not existing:
            # Copy system category for user
            category = Category(
                user_id=user_id,
                name=sys_cat.name,
                category_type=sys_cat.category_type,
                icon=sys_cat.icon,
                color=sys_cat.color,
                description=sys_cat.description,
                is_system=False,
            )
            db.add(category)
            categories.append(category)
    
    if categories:
        db.commit()
        for cat in categories:
            db.refresh(cat)
        logger.info(f"Seeded {len(categories)} categories for user {user_id}")
    
    return categories


def create_sample_mappings(db: Session, user_id: UUID) -> list[CategoryMapping]:
    """
    Create sample category mappings for a user.
    
    Args:
        db: Database session
        user_id: User UUID
    
    Returns:
        List of created mappings
    """
    # Get user's categories
    categories = (
        db.query(Category)
        .filter(
            Category.user_id == user_id,
            Category.is_active == True,  # noqa: E712
        )
        .all()
    )
    
    # Create category lookup
    category_lookup = {cat.name: cat for cat in categories}
    
    # Sample mappings
    sample_mappings = [
        {
            "name": "Salary Income",
            "contains_text": "salary",
            "category_name": "Salary",
            "priority": 100,
        },
        {
            "name": "Rent Payment",
            "contains_text": "rent",
            "category_name": "Rent",
            "priority": 90,
        },
        {
            "name": "Grocery Stores",
            "contains_text": "grocery",
            "category_name": "Groceries",
            "priority": 80,
        },
        {
            "name": "Big Bazaar",
            "merchant_name": "big bazaar",
            "category_name": "Groceries",
            "priority": 75,
        },
        {
            "name": "Zomato",
            "contains_text": "zomato",
            "category_name": "Dining Out",
            "priority": 70,
        },
        {
            "name": "Swiggy",
            "contains_text": "swiggy",
            "category_name": "Dining Out",
            "priority": 70,
        },
        {
            "name": "Electricity Bill",
            "contains_text": "electricity",
            "category_name": "Utilities",
            "priority": 60,
        },
        {
            "name": "Petrol",
            "contains_text": "petrol",
            "category_name": "Transportation",
            "priority": 50,
        },
        {
            "name": "Uber",
            "contains_text": "uber",
            "category_name": "Transportation",
            "priority": 50,
        },
        {
            "name": "Ola",
            "contains_text": "ola",
            "category_name": "Transportation",
            "priority": 50,
        },
        {
            "name": "Netflix",
            "contains_text": "netflix",
            "category_name": "Entertainment",
            "priority": 40,
        },
        {
            "name": "Amazon",
            "contains_text": "amazon",
            "category_name": "Shopping",
            "priority": 30,
        },
        {
            "name": "Flipkart",
            "contains_text": "flipkart",
            "category_name": "Shopping",
            "priority": 30,
        },
    ]
    
    mappings = []
    
    for mapping_data in sample_mappings:
        category_name = mapping_data.pop("category_name")
        category = category_lookup.get(category_name)
        
        if not category:
            continue
        
        # Check if mapping already exists
        existing = (
            db.query(CategoryMapping)
            .filter(
                CategoryMapping.user_id == user_id,
                CategoryMapping.name == mapping_data["name"],
            )
            .first()
        )
        
        if not existing:
            mapping = CategoryMapping(
                user_id=user_id,
                category_id=category.id,
                **mapping_data,
            )
            db.add(mapping)
            mappings.append(mapping)
    
    if mappings:
        db.commit()
        for mapping in mappings:
            db.refresh(mapping)
        logger.info(f"Created {len(mappings)} sample mappings for user {user_id}")
    
    return mappings


def seed_all(db: Session, user_id: UUID) -> dict:
    """
    Seed all default data for a user.
    
    Args:
        db: Database session
        user_id: User UUID
    
    Returns:
        Dictionary with counts of created items
    """
    # Create system categories (if not exists)
    create_system_categories(db)
    
    # Seed user categories
    user_categories = seed_default_categories(db, user_id)
    
    # Create sample mappings
    sample_mappings = create_sample_mappings(db, user_id)
    
    return {
        "categories_created": len(user_categories),
        "mappings_created": len(sample_mappings),
    }
