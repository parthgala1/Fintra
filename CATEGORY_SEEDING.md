# Category Seeding Management

## Overview

Categories are automatically managed for both new and existing users through two complementary mechanisms:

1. **Auto-seeding on Startup** - System categories are created when the backend starts
2. **Auto-seeding on User Login** - Individual user categories are created when they first log in
3. **Management Script** - For bulk seeding of existing users without categories

## System Categories

When the backend starts, **15 system categories** are automatically created (if they don't exist):

| Type | Categories |
|------|-----------|
| **Income** | Salary |
| **Needs** | Rent, Groceries, Utilities, Transportation, Healthcare |
| **Wants** | Dining Out, Entertainment, Shopping, Travel |
| **Savings** | Investments, Savings |
| **Transfers** | Bank Transfer, Credit Card Payment |

These system categories are shared across all users and are used as templates.

## Automatic Seeding Mechanisms

### 1. New Users (Signup)

When a user registers:
1. System categories are ensured to exist
2. User gets a **personal copy** of all 15 system categories (with `user_id` set)
3. User gets 13 **sample category mappings** (e.g., "salary" → Salary category)
4. All happens automatically in the signup endpoint

**Result:** User can immediately start uploading transactions with proper categorization.

### 2. Existing Users (Login) - Auto-Recovery

When an existing user logs in:
1. System checks if they have any personal categories
2. If they have **0 categories** (missing data), auto-seeds them
3. User gets all 15 personal categories + 13 sample mappings
4. Process is **silent and transparent** - user just logs in normally

**Benefit:** Existing users who didn't have categories now get them automatically.

**When does this happen?**
- Users who existed before the auto-seeding feature was added
- Users whose categories were accidentally deleted
- Any manual database cleanup scenarios

### 3. Manual Seeding (Management Script)

For bulk seeding or external triggers:

```bash
# Run inside Docker backend container
docker-compose exec backend python seed_existing_users.py
```

**What it does:**
1. Finds all users with 0 categories
2. Creates system categories (if needed)
3. Seeds all users who need categories
4. Logs detailed progress and results

**Output example:**
```
Found 1 total users
Creating/verifying system categories...
System categories ready (0 new, rest already existed)
  User parth.gala1356@gmail.com has 0 categories

Seeding 1 users without categories...
✓ Seeded parth.gala1356@gmail.com: 15 categories, 13 mappings

✓ Successfully seeded 1/1 users
```

## Database Schema

### System Categories
```sql
-- System categories (shared, null user_id)
SELECT * FROM categories 
WHERE is_system = true 
AND user_id IS NULL;
```

### User Categories
```sql
-- User's personal copy
SELECT * FROM categories 
WHERE user_id = 'user-uuid'
AND is_system = false;
```

### Category Mappings
```sql
-- Sample mappings for user
SELECT * FROM category_mappings 
WHERE user_id = 'user-uuid';
```

## Implementation Details

### Backend Files Modified

1. **server/main.py**
   - Startup: Calls `create_system_categories()` to ensure system categories exist

2. **server/auth/router.py** 
   - Login: Checks user's category count
   - If 0, calls `seed_all()` to restore categories silently

3. **server/data/seed_categories.py**
   - `create_system_categories()` - Creates 15 system categories (idempotent)
   - `seed_default_categories()` - Copies system categories to user
   - `create_sample_mappings()` - Creates 13 sample classification rules
   - `seed_all()` - Orchestrates the full seeding process

4. **server/seed_existing_users.py** (NEW)
   - Standalone script for manual/bulk seeding
   - Can be run independently as a management tool

## Usage Scenarios

### Scenario 1: Fresh Database Reset
```bash
# Kill and restart everything
docker-compose down -v  # Remove all volumes
docker-compose up

# When you sign up as a new user:
# → All 15 categories are created automatically
# → All 13 sample mappings are created
# → Ready to upload transactions
```

### Scenario 2: Existing User (Before Auto-seeding)
```bash
# User logs in for first time after update
# → System detects 0 categories
# → Auto-seeds all 15 categories + 13 mappings
# → User can now categorize immediately
```

### Scenario 3: Bulk Seeding Multiple Users
```bash
# Several existing users need categories
docker-compose exec backend python seed_existing_users.py

# Script finds all users without categories and seeds them
```

### Scenario 4: Manual Category Recovery
```bash
# User accidentally deleted all their categories
# → Next login triggers auto-seeding
# → Categories are restored
```

## Troubleshooting

### User has 0 categories after login

**Check 1:** Verify system categories were created
```bash
docker-compose exec postgres psql -U fintra_user -d fintra_db -c "SELECT COUNT(*) FROM categories WHERE is_system=true;"
```

**Check 2:** Verify user categories exist
```bash
docker-compose exec postgres psql -U fintra_user -d fintra_db -c "SELECT COUNT(*) FROM categories WHERE user_id='USER_ID';"
```

**Check 3:** Run manual seed script
```bash
docker-compose exec backend python seed_existing_users.py
```

**Check 4:** Review server logs
```bash
docker-compose logs backend | grep -i category
```

### Sample mappings not working

Verify they were created:
```bash
docker-compose exec postgres psql -U fintra_user -d fintra_db -c "SELECT * FROM category_mappings WHERE user_id='USER_ID';"
```

If missing, run the seed script again.

## Best Practices

1. **Always check logs during login** - Watch for auto-seeding messages
2. **Run seed script after major database changes**
3. **Test with fresh user signup** - Validates the full flow
4. **Monitor category count per user** - Should always be 15+ after seeding

## Future Enhancements

1. **API endpoint** to trigger seeding on-demand
2. **Custom category templates** beyond the default 15
3. **Category import/export** for user-provided templates
4. **Migration tool** to convert categories from other apps
