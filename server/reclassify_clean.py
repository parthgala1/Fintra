from database import SessionLocal
from models.transaction import Transaction
from models.user import User
from models.category import Category
from sqlalchemy import func

db = SessionLocal()

# Get the user
user = db.query(User).filter(User.email == "parth.gala1356@gmail.com").first()
if not user:
    print("User not found")
    db.close()
    exit(1)

print(f"User: {user.email}")

# Get all transactions for this user
transactions = db.query(Transaction).filter(Transaction.user_id == user.id).all()

# Reset all to Uncategorized first
uncategorized = db.query(Category).filter(Category.user_id == user.id, Category.name == "Uncategorized").first()
for tx in transactions:
    tx.category_id = uncategorized.id
db.commit()

print(f"Reset {len(transactions)} transactions to Uncategorized\n")

# Now reclassify using the new logic
from services.classification_engine import classify_transaction

print(f"Re-classifying {len(transactions)} transactions with new logic...")

for i, tx in enumerate(transactions):
    tx_data = {
        "description": tx.description,
        "amount": float(tx.amount) if tx.amount else 0,
    }
    
    new_category_id = classify_transaction(db, tx_data, user.id)
    tx.category_id = new_category_id
    db.commit()
    
    if i < 5 or i % 5 == 0:  # Show first 5 and every 5th
        cat = db.query(Category).filter(Category.id == new_category_id).first()
        print(f"  [{i+1}/{len(transactions)}] {tx.description[:60]}... -> {cat.name}")

print(f"\nFinal categorization:")
new_stats = db.query(
    Category.name,
    func.count(Transaction.id).label('count')
).join(
    Transaction, Category.id == Transaction.category_id
).filter(
    Transaction.user_id == user.id
).group_by(Category.name).order_by(func.count(Transaction.id).desc()).all()

for cat_name, count in new_stats:
    print(f"  {cat_name}: {count}")

db.close()
print("\nDone!")
