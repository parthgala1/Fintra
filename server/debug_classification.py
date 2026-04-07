from database import SessionLocal
from models.transaction import Transaction
from models.user import User
from models.category import Category
from services.classification_engine import apply_rule_based_classification, apply_keyword_matching
import logging

logging.basicConfig(level=logging.DEBUG)

db = SessionLocal()

# Get the user
user = db.query(User).filter(User.email == "parth.gala1356@gmail.com").first()
print(f"User: {user.email}\n")

# Get one transaction  
tx = db.query(Transaction).filter(Transaction.user_id == user.id).first()
print(f"Transaction: {tx.description}")
print(f"Amount: {tx.amount}")
print(f"Current category: {db.query(Category).filter(Category.id == tx.category_id).first().name}\n")

# Test rule-based classification
print("Testing rule-based classification...")
rule_result = apply_rule_based_classification(db, tx.description, float(tx.amount), user.id)
if rule_result:
    cat = db.query(Category).filter(Category.id == rule_result).first()
    print(f"  Result: {cat.name}")
else:
    print(f"  Result: None")

# Test fuzzy classification
print("\nTesting fuzzy (keyword) classification...")
fuzzy_result = apply_keyword_matching(db, tx.description, user.id)
if fuzzy_result:
    cat = db.query(Category).filter(Category.id == fuzzy_result).first()
    print(f"  Result: {cat.name}")
else:
    print(f"  Result: None")

# Get mappings for this user
print(f"\nUser's category mappings:")
from models.category_mapping import CategoryMapping
mappings = db.query(CategoryMapping).filter(CategoryMapping.user_id == user.id, CategoryMapping.is_active == True).order_by(CategoryMapping.priority.desc()).all()
for m in mappings[:5]:
    cat = db.query(Category).filter(Category.id == m.category_id).first()
    print(f"  {m.name}: contains_text={m.contains_text}, merchant={m.merchant_name} -> {cat.name} (priority={m.priority})")

db.close()
