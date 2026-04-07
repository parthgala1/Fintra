from database import SessionLocal
from models.transaction import Transaction
from models.user import User
from services.classification_engine import classify_transaction

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
print(f"Total transactions: {len(transactions)}\n")

# Check current categorization
from sqlalchemy import func
from models.category import Category

current_stats = db.query(
    Category.name,
    func.count(Transaction.id).label('count')
).join(
    Transaction, Category.id == Transaction.category_id
).filter(
    Transaction.user_id == user.id
).group_by(Category.name).all()

print("Current categorization:")
for cat_name, count in current_stats:
    print(f"  {cat_name}: {count}")

print(f"\nRe-classifying {len(transactions)} transactions...")

reclassified_count = 0
for i, tx in enumerate(transactions):
    # Get transaction data for classification
    tx_data = {
        "description": tx.description,
        "amount": float(tx.amount) if tx.amount else 0,
    }
    
    # Classify
    new_category_id = classify_transaction(db, tx_data, user.id)
    
    # Update only if category changed
    if new_category_id != tx.category_id:
        old_cat = db.query(Category).filter(Category.id == tx.category_id).first()
        new_cat = db.query(Category).filter(Category.id == new_category_id).first()
        tx.category_id = new_category_id
        db.commit()
        reclassified_count += 1
        
        if i < 5 or i % 10 == 0:  # Show first 5 and every 10th
            print(f"  [{i+1}/{len(transactions)}] {tx.description[:50]}... | {old_cat.name} -> {new_cat.name}")

print(f"\nRe-classified {reclassified_count} transactions")

# Show new stats
print("\nNew categorization:")
new_stats = db.query(
    Category.name,
    func.count(Transaction.id).label('count')
).join(
    Transaction, Category.id == Transaction.category_id
).filter(
    Transaction.user_id == user.id
).group_by(Category.name).all()

for cat_name, count in new_stats:
    print(f"  {cat_name}: {count}")

db.close()
print("\nDone!")
