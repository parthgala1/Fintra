"""
Classification engine service for categorizing transactions.

Uses a multi-stage classification approach:
1. Rule-based classification (CategoryMapping)
2. Keyword matching (fuzzy search)
3. AI classification (LLM) - with learning capabilities
4. Uncategorized fallback

Phase 1 Optimizations:
- Auto-learns rules from successful AI classifications
- Batch AI classification for bulk uploads
"""

import logging
import re
import json
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List, Tuple
from uuid import UUID

from fuzzywuzzy import fuzz
from sqlalchemy.orm import Session

from config import settings

logger = logging.getLogger(__name__)

# API call tracking (thread-safe)
_api_call_lock = threading.Lock()
_api_call_count = 0


def increment_api_calls() -> int:
    """Increment and return the current API call count."""
    global _api_call_count
    with _api_call_lock:
        _api_call_count += 1
        return _api_call_count


def get_api_call_count() -> int:
    """Get the current API call count."""
    global _api_call_count
    with _api_call_lock:
        return _api_call_count


def reset_api_call_count() -> None:
    """Reset the API call count."""
    global _api_call_count
    with _api_call_lock:
        _api_call_count = 0


def classify_transaction(
    db: Session,
    transaction: Dict[str, Any],
    user_id: UUID,
) -> UUID:
    """
    Classify a transaction using the multi-stage fallback approach.
    
    Args:
        db: Database session
        transaction: Normalized transaction data
        user_id: User UUID
    
    Returns:
        Category UUID
    """
    description = transaction.get("description", "")
    amount = transaction.get("amount", 0)
    
    logger.debug(f"Classifying transaction: {description}")
    
    # Stage 1: Rule-based classification
    category_id = apply_rule_based_classification(db, description, amount, user_id)
    if category_id:
        logger.debug(f"Rule-based classification matched: {category_id}")
        return category_id
    
    # Stage 2: AI classification (moved before fuzzy keyword matching for better accuracy)
    if settings.AI_CLASSIFICATION_ENABLED:
        category_id = apply_ai_classification(db, description, amount, user_id)
        if category_id:
            logger.debug(f"AI classification matched: {category_id}")
            return category_id
    
    # Stage 3: Keyword matching
    category_id = apply_keyword_matching(db, description, user_id)
    if category_id:
        logger.debug(f"Keyword matching matched: {category_id}")
        return category_id
    
    # Stage 4: Uncategorized fallback
    return get_or_create_uncategorized(db, user_id)


def apply_rule_based_classification(
    db: Session,
    description: str,
    amount: float,
    user_id: UUID,
) -> Optional[UUID]:
    """
    Apply rule-based classification using CategoryMapping.
    
    Args:
        db: Database session
        description: Transaction description
        amount: Transaction amount
        user_id: User UUID
    
    Returns:
        Category UUID if match found, None otherwise
    """
    from models.category_mapping import CategoryMapping
    
    # Get user's mappings, sorted by priority (highest first)
    mappings = (
        db.query(CategoryMapping)
        .filter(
            CategoryMapping.user_id == user_id,
            CategoryMapping.is_active == True,  # noqa: E712
        )
        .order_by(CategoryMapping.priority.desc())
        .all()
    )
    
    description_lower = description.lower()
    
    for mapping in mappings:
        # Check all matching conditions (AND logic)
        matches = True
        
        # Check contains_text
        if mapping.contains_text:
            if mapping.contains_text.lower() not in description_lower:
                matches = False
        
        # Check starts_with
        if matches and mapping.starts_with:
            if not description_lower.startswith(mapping.starts_with.lower()):
                matches = False
        
        # Check ends_with
        if matches and mapping.ends_with:
            if not description_lower.endswith(mapping.ends_with.lower()):
                matches = False
        
        # Check regex_pattern
        if matches and mapping.regex_pattern:
            try:
                if not re.search(mapping.regex_pattern, description, re.IGNORECASE):
                    matches = False
            except re.error:
                pass  # Invalid regex, skip
        
        # Check merchant_name
        if matches and mapping.merchant_name:
            merchant_name = mapping.merchant_name.lower()
            if merchant_name not in description_lower:
                matches = False
        
        # Check amount range
        if matches and (mapping.amount_min or mapping.amount_max):
            try:
                if mapping.amount_min:
                    if amount < float(str(mapping.amount_min)):
                        matches = False
                if matches and mapping.amount_max:
                    if amount > float(str(mapping.amount_max)):
                        matches = False
            except (ValueError, TypeError):
                pass  # Invalid amount range
        
        if matches:
            # Update statistics
            mapping.match_count = (mapping.match_count or 0) + 1
            mapping.last_matched_at = datetime.now(timezone.utc)
            db.commit()
            
            logger.debug(f"Rule matched: {mapping.name} -> {mapping.category_id}")
            return mapping.category_id
    
    return None


def apply_keyword_matching(
    db: Session,
    description: str,
    user_id: UUID,
) -> Optional[UUID]:
    """
    Apply fuzzy keyword matching to find similar category names.
    
    Args:
        db: Database session
        description: Transaction description
        user_id: User UUID
    
    Returns:
        Category UUID if match found, None otherwise
    """
    from models.category import Category
    
    # Get user's categories
    categories = (
        db.query(Category)
        .filter(
            Category.user_id == user_id,
            Category.is_active == True,  # noqa: E712
        )
        .all()
    )
    
    if not categories:
        return None
    
    description_lower = description.lower()
    best_match_id = None
    best_score = 0
    
    for category in categories:
        # Get category keywords from name
        category_words = category.name.lower().split()
        
        # Check each word in description
        for word in category_words:
            if len(word) < 3:
                continue
            
            # Fuzzy match
            score = fuzz.partial_ratio(word, description_lower)
            
            if score > best_score and score >= 70:  # Threshold
                best_score = score
                best_match_id = category.id
    
    return best_match_id


def apply_ai_classification(
    db: Session,
    description: str,
    amount: float,
    user_id: UUID,
) -> Optional[UUID]:
    """
    Apply AI/LLM-based classification using Groq.
    
    Args:
        db: Database session
        description: Transaction description
        amount: Transaction amount
        user_id: User UUID
    
    Returns:
        Category UUID if classified and found, None otherwise
    """
    if not settings.AI_API_KEY:
        logger.debug("AI classification skipped: No API key configured")
        return None
    
    logger.debug(f"AI classification for: {description}")
    
    try:
        from groq import Groq
        from models.category import Category
        
        # Get user's categories for the prompt
        categories = (
            db.query(Category)
            .filter(Category.user_id == user_id, Category.is_active == True)  # noqa: E712
            .all()
        )
        category_names = [cat.name for cat in categories if cat.name != "Uncategorized"]
        
        # Initialize Groq client without proxies parameter (SDK compatibility)
        client = Groq(api_key=settings.AI_API_KEY)
        
        prompt = build_classification_prompt(
            {"description": description, "amount": amount},
            categories=category_names
        )
        
        response = client.chat.completions.create(
            model=settings.AI_MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a financial transaction classifier. Respond with ONLY the exact category name."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=50,
            temperature=0.1,
        )
        
        # Track API call
        call_count = increment_api_calls()
        logger.info(f"Groq API call #{call_count} (individual)")
        
        category_name = response.choices[0].message.content.strip()
        logger.debug(f"AI classified as: {category_name}")
        
        # Find category by name for this user
        category = (
            db.query(Category)
            .filter(
                Category.user_id == user_id,
                Category.name.ilike(category_name),
            )
            .first()
        )
        
        if category:
            logger.debug(f"AI classification matched category UUID: {category.id}")
            # Learn from successful classification if enabled
            if settings.AI_LEARN_PATTERNS:
                create_learned_rule(
                    db,
                    user_id,
                    category.id,
                    description,
                    merchant_name=None,
                    amount=amount,
                    confidence_score=0.90  # High confidence for exact matches
                )
            return category.id
        
        # If exact name not found, try fuzzy match
        categories = (
            db.query(Category)
            .filter(Category.user_id == user_id, Category.is_active == True)  # noqa: E712
            .all()
        )
        
        best_match_id = None
        best_score = 0
        for cat in categories:
            score = fuzz.token_set_ratio(category_name.lower(), cat.name.lower())
            if score > best_score and score >= 60:
                best_score = score
                best_match_id = cat.id
        
        if best_match_id:
            logger.debug(f"AI fuzzy matched to category UUID: {best_match_id} (score: {best_score})")
            # Learn from fuzzy match with lower confidence
            if settings.AI_LEARN_PATTERNS and best_score >= 80:
                create_learned_rule(
                    db,
                    user_id,
                    best_match_id,
                    description,
                    merchant_name=None,
                    amount=amount,
                    confidence_score=float(best_score) / 100.0  # Convert to 0-1 scale
                )
            return best_match_id
        
        logger.debug(f"AI classification could not find matching category for: {category_name}")
        return None
         
    except ImportError:
        logger.warning("groq package not installed")
        return None
    except Exception as e:
        logger.error(f"AI classification error: {e}")
        return None


def create_learned_rule(
    db: Session,
    user_id: UUID,
    category_id: UUID,
    description: str,
    merchant_name: Optional[str] = None,
    amount: Optional[float] = None,
    confidence_score: float = 100.0,
) -> Optional[UUID]:
    """
    Create a learned rule from a successful AI classification.
    
    This function auto-generates rule-based patterns from transactions that were
    successfully classified by AI, enabling faster future classifications.
    
    Args:
        db: Database session
        user_id: User UUID
        category_id: Category UUID
        description: Transaction description
        merchant_name: Optional merchant name
        amount: Optional transaction amount
        confidence_score: Confidence score (0-100)
    
    Returns:
        Created CategoryMapping UUID or None if failed
    """
    from models.category_mapping import CategoryMapping
    
    if not settings.AI_LEARN_PATTERNS:
        return None
    
    try:
        # Convert confidence score to 0-100 range if needed
        if confidence_score <= 1.0:
            confidence_score = confidence_score * 100.0
        
        # Only create rule if confidence is above threshold
        if confidence_score < (settings.AI_CONFIDENCE_THRESHOLD * 100):
            logger.debug(f"Confidence {confidence_score} below threshold, not creating rule")
            return None
        
        # Extract merchant name if available
        extracted_merchant = merchant_name or extract_merchant_from_description(description)
        
        # Skip creating rule if merchant is too generic (single letter, common words, etc.)
        if extracted_merchant:
            merchant_lower = extracted_merchant.lower()
            if (
                len(extracted_merchant) <= 2 or  # Single letter or two-letter merchants
                merchant_lower in ["mr", "ms", "dr", "new", "old", "the", "and", "to", "from"]  # Common words
            ):
                logger.debug(f"Skipping learned rule for generic merchant: {extracted_merchant}")
                return None
        
        # Build rule name
        rule_name = f"Learned: {extracted_merchant or description[:40]}"
        
        # Check if similar learned rule already exists for this user+category+merchant
        if extracted_merchant:
            existing = db.query(CategoryMapping).filter(
                CategoryMapping.user_id == user_id,
                CategoryMapping.category_id == category_id,
                CategoryMapping.merchant_name == extracted_merchant,
                CategoryMapping.learned_from_ai == True
            ).first()
            
            if existing:
                logger.debug(f"Learned rule already exists for merchant {extracted_merchant}")
                # Update confidence score if new score is higher
                if confidence_score > existing.confidence_score:
                    existing.confidence_score = float(confidence_score)
                    db.commit()
                return existing.id
        
        # Create mapping rule with both merchant_name and contains_text for better matching
        mapping = CategoryMapping(
            user_id=user_id,
            category_id=category_id,
            name=rule_name,
            description=f"Auto-generated from AI classification with {confidence_score:.0f}% confidence",
            merchant_name=extracted_merchant,
            contains_text=extracted_merchant,  # Also use contains_text for better matching
            learned_from_ai=True,
            auto_generated=True,
            confidence_score=float(confidence_score),
            priority=50,  # Medium priority (user rules have 100+, system rules have 0-50)
            is_active=True,
            is_system=False,
        )
        
        db.add(mapping)
        db.commit()
        db.refresh(mapping)
        
        logger.info(f"Created learned rule for user {user_id}: {rule_name} -> {category_id}")
        return mapping.id
        
    except Exception as e:
        logger.error(f"Error creating learned rule: {e}")
        db.rollback()
        return None


def create_user_correction_rule(
    db: Session,
    user_id: UUID,
    category_id: UUID,
    description: str,
    merchant_name: Optional[str] = None,
    amount: Optional[float] = None,
    old_category_id: Optional[UUID] = None,
) -> Optional[UUID]:
    """
    Create a learned rule from a user's manual category correction.
    
    When a user manually changes a transaction's category, we learn from this
    correction and create a rule so future similar transactions are automatically
    categorized correctly.
    
    User corrections are given HIGHER priority and confidence than AI-learned rules
    because they represent explicit user intent.
    
    Args:
        db: Database session
        user_id: User UUID
        category_id: New (corrected) category UUID
        description: Transaction description
        merchant_name: Optional merchant name
        amount: Optional transaction amount
        old_category_id: Previous category UUID (for logging)
    
    Returns:
        Created CategoryMapping UUID or None if failed
    """
    from models.category_mapping import CategoryMapping
    from models.category import Category
    
    try:
        # Extract merchant name if available
        extracted_merchant = merchant_name or extract_merchant_from_description(description)
        
        # Skip creating rule if merchant is too generic or missing
        if not extracted_merchant or len(extracted_merchant) <= 2:
            logger.debug(f"Skipping user correction rule: merchant too generic or missing")
            return None
        
        # Skip common generic words
        merchant_lower = extracted_merchant.lower()
        if merchant_lower in ["mr", "ms", "dr", "new", "old", "the", "and", "to", "from", "payment", "transfer"]:
            logger.debug(f"Skipping user correction rule for generic merchant: {extracted_merchant}")
            return None
        
        # Get category name for logging
        category = db.query(Category).filter(Category.id == category_id).first()
        category_name = category.name if category else "Unknown"
        
        # Build rule name
        rule_name = f"User Rule: {extracted_merchant}"
        
        # Check if similar user correction rule already exists for this user+category+merchant
        existing = db.query(CategoryMapping).filter(
            CategoryMapping.user_id == user_id,
            CategoryMapping.category_id == category_id,
            CategoryMapping.merchant_name == extracted_merchant,
            CategoryMapping.learned_from_ai == False,  # User-created rules
        ).first()
        
        if existing:
            logger.info(f"User correction rule already exists for merchant {extracted_merchant} -> {category_name}")
            # Update confidence to max (user knows best)
            if existing.confidence_score < 100.0:
                existing.confidence_score = 100.0
                existing.match_count = (existing.match_count or 0) + 1
                existing.last_matched_at = datetime.now()
                db.commit()
            return existing.id
        
        # Check if there's an AI-learned rule pointing to a DIFFERENT category
        # If so, delete it (user correction overrides AI)
        conflicting_ai_rule = db.query(CategoryMapping).filter(
            CategoryMapping.user_id == user_id,
            CategoryMapping.merchant_name == extracted_merchant,
            CategoryMapping.learned_from_ai == True,
            CategoryMapping.category_id != category_id,
        ).first()
        
        if conflicting_ai_rule:
            logger.info(f"Deleting conflicting AI rule for {extracted_merchant} (user corrected)")
            db.delete(conflicting_ai_rule)
        
        # Create mapping rule with HIGHER priority than AI-learned rules
        mapping = CategoryMapping(
            user_id=user_id,
            category_id=category_id,
            name=rule_name,
            description=f"Created from user correction: {extracted_merchant} → {category_name}",
            merchant_name=extracted_merchant,
            contains_text=extracted_merchant,  # Also use contains_text for better matching
            learned_from_ai=False,  # This is a USER correction, not AI-learned
            auto_generated=True,
            confidence_score=100.0,  # Maximum confidence - user knows best!
            priority=90,  # HIGH priority (higher than AI-learned rules at 50)
            is_active=True,
            is_system=False,
            match_count=1,
            last_matched_at=datetime.now(),
        )
        
        db.add(mapping)
        db.commit()
        db.refresh(mapping)
        
        old_cat_name = "Unknown"
        if old_category_id:
            old_cat = db.query(Category).filter(Category.id == old_category_id).first()
            old_cat_name = old_cat.name if old_cat else "Unknown"
        
        logger.info(
            f"✓ Created user correction rule for '{extracted_merchant}': "
            f"{old_cat_name} → {category_name} (priority: 90, confidence: 100%)"
        )
        
        return mapping.id
        
    except Exception as e:
        logger.error(f"Error creating user correction rule: {e}", exc_info=True)
        db.rollback()
        return None


def extract_merchant_from_description(description: str) -> Optional[str]:
    """
    Extract merchant name from transaction description.
    
    Args:
        description: Transaction description
    
    Returns:
        Extracted merchant name or None
    """
    from services.transaction_normalizer import extract_merchant_name
    return extract_merchant_name(description)


def batch_ai_classification(
    db: Session,
    transactions: List[Dict[str, Any]],
    user_id: UUID,
) -> Dict[str, UUID]:
    """
    Classify multiple transactions in a single batch AI request.
    
    This function groups uncategorized transactions and sends them to AI in a single
    request, dramatically reducing API calls during bulk uploads.
    
    Automatically splits large batches into smaller chunks to avoid token limits.
    
    Args:
        db: Database session
        transactions: List of transaction dictionaries
        user_id: User UUID
    
    Returns:
        Dictionary mapping transaction keys to category UUIDs
    """
    if not settings.AI_CLASSIFICATION_ENABLED or not settings.AI_BATCH_ENABLED:
        return {}
    
    if len(transactions) == 0:
        return {}
    
    logger.debug(f"Batch AI classification for {len(transactions)} transactions")
    
    try:
        from groq import Groq
        from models.category import Category
        
        # Get user's categories for the prompt
        categories = (
            db.query(Category)
            .filter(Category.user_id == user_id, Category.is_active == True)  # noqa: E712
            .all()
        )
        category_names = [cat.name for cat in categories if cat.name != "Uncategorized"]
        
        logger.info(f"Batch AI: Found {len(categories)} total categories, {len(category_names)} usable categories for user {user_id}")
        
        if not category_names:
            logger.warning(f"No usable categories found for batch classification - returning empty")
            return {}
        
        # Initialize Groq client
        client = Groq(api_key=settings.AI_API_KEY)
        
        # Split transactions into smaller batches to avoid token limits
        batch_size = min(settings.AI_BATCH_SIZE, 10)  # Max 10 per batch to stay under token limit
        all_results = {}
        
        for batch_idx in range(0, len(transactions), batch_size):
            batch_txns = transactions[batch_idx:batch_idx + batch_size]
            logger.debug(f"Processing batch {batch_idx // batch_size + 1} of {(len(transactions) + batch_size - 1) // batch_size}")
            
            # Build batch prompt
            prompt = build_batch_classification_prompt(batch_txns, category_names)
            
            try:
                response = client.chat.completions.create(
                    model=settings.AI_MODEL_NAME,
                    messages=[
                        {"role": "system", "content": "You are a financial transaction classifier. Respond with valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=2000,
                    temperature=0.1,
                )
                
                # Track API call
                call_count = increment_api_calls()
                logger.info(f"Groq API call #{call_count} (batch {batch_idx // batch_size + 1} of {(len(transactions) + batch_size - 1) // batch_size})")
                
                response_text = response.choices[0].message.content.strip()
                logger.info(f"Batch AI response ({len(response_text)} chars): {response_text[:1000]}")
                
                # Parse JSON response
                try:
                    classifications = json.loads(response_text)
                    logger.info(f"Successfully parsed JSON: {type(classifications).__name__} with {len(classifications) if isinstance(classifications, dict) else 'N/A'} entries")
                except json.JSONDecodeError as je:
                    # Try to extract JSON from the response
                    import re as regex_module
                    logger.warning(f"JSON decode error at position {je.pos}: {je.msg}. Response was: {response_text}")
                    json_match = regex_module.search(r'\{.*\}', response_text, regex_module.DOTALL)
                    if json_match:
                        try:
                            classifications = json.loads(json_match.group())
                            logger.info(f"Successfully extracted JSON from response")
                        except json.JSONDecodeError as je2:
                            logger.error(f"Failed to parse extracted JSON at position {je2.pos}: {je2.msg}")
                            logger.error(f"Response was: {response_text}")
                            continue
                    else:
                        logger.error(f"Failed to find JSON in response: {response_text}")
                        continue
                
                # Map category names to UUIDs and build results
                category_map = {cat.name: cat.id for cat in categories}
                logger.info(f"Available categories: {list(category_map.keys())}")
                
                if isinstance(classifications, dict):
                    # Response format: {"transaction_key": "category_name", ...}
                    for tx_key, category_name in classifications.items():
                        if category_name in category_map:
                            all_results[tx_key] = category_map[category_name]
                            logger.info(f"Batch classified {tx_key} -> {category_name} (exact match)")
                        else:
                            # Fuzzy match fallback
                            best_match = None
                            best_score = 0
                            for user_cat_name, user_cat_id in category_map.items():
                                score = fuzz.token_set_ratio(category_name.lower(), user_cat_name.lower())
                                if score > best_score:
                                    best_score = score
                                    best_match = (user_cat_name, user_cat_id)
                            
                            if best_match and best_score >= 80:  # 80% threshold
                                all_results[tx_key] = best_match[1]
                                logger.info(f"Batch classified {tx_key} -> {category_name} fuzzy matched to {best_match[0]} (score: {best_score})")
                            else:
                                logger.warning(f"Category '{category_name}' not found in user's categories. Available: {list(category_map.keys())}")
                elif isinstance(classifications, list):
                    # Response might be array format - convert to dict
                    logger.warning(f"Batch response is list format instead of dict: {classifications}")
                    for item in classifications:
                        if isinstance(item, dict) and "id" in item and "name" in item:
                            tx_id = str(item["id"])
                            category_name = item["name"]
                            if category_name in category_map:
                                all_results[tx_id] = category_map[category_name]
                                logger.info(f"Batch classified {tx_id} -> {category_name} (exact match)")
                            else:
                                # Fuzzy match fallback
                                best_match = None
                                best_score = 0
                                for user_cat_name, user_cat_id in category_map.items():
                                    score = fuzz.token_set_ratio(category_name.lower(), user_cat_name.lower())
                                    if score > best_score:
                                        best_score = score
                                        best_match = (user_cat_name, user_cat_id)
                                
                                if best_match and best_score >= 80:
                                    all_results[tx_id] = best_match[1]
                                    logger.info(f"Batch classified {tx_id} -> {category_name} fuzzy matched to {best_match[0]} (score: {best_score})")
                                else:
                                    logger.warning(f"Category '{category_name}' not found. Available: {list(category_map.keys())}")
                else:
                    logger.error(f"Unexpected response format: {type(classifications)} - {classifications}")
            
            except Exception as e:
                logger.error(f"Error processing batch {batch_idx // batch_size + 1}: {e}", exc_info=True)
                continue
        
        logger.info(f"Batch classified {len(all_results)} transactions total")
        return all_results
        
    except ImportError:
        logger.warning("groq package not installed for batch classification")
        return {}
    except Exception as e:
        logger.error(f"Batch AI classification error: {e}")
        return {}


def get_or_create_uncategorized(db: Session, user_id: UUID) -> UUID:
    """
    Get or create the "Uncategorized" category for a user.
    
    Args:
        db: Database session
        user_id: User UUID
    
    Returns:
        Uncategorized category UUID
    """
    from models.category import Category, CategoryType
    
    # Try to find existing uncategorized category
    uncategorized = (
        db.query(Category)
        .filter(
            Category.user_id == user_id,
            Category.name == "Uncategorized",
        )
        .first()
    )
    
    if uncategorized:
        return uncategorized.id
    
    # Create new uncategorized category
    uncategorized = Category(
        user_id=user_id,
        name="Uncategorized",
        category_type=CategoryType.NEEDS,
        icon="question-circle",
        color="#808080",
        description="Transactions that need manual categorization",
        is_system=False,
    )
    
    db.add(uncategorized)
    db.commit()
    db.refresh(uncategorized)
    
    logger.info(f"Created Uncategorized category for user {user_id}")
    
    return uncategorized.id




def build_batch_classification_prompt(transactions: List[Dict[str, Any]], categories: List[str]) -> str:
    """
    Build a batch classification prompt for multiple transactions.
    
    Optimized to minimize token usage by truncating descriptions and using compact formatting.
    
    Args:
        transactions: List of transaction dictionaries
        categories: List of available category names
    
    Returns:
        Prompt string requesting batch classification in JSON format
    """
    category_list = ", ".join(sorted(categories))
    
    # Build transaction list for prompt - OPTIMIZED FOR TOKEN USAGE
    tx_list = []
    for idx, tx in enumerate(transactions):
        # Use _batch_index if available, otherwise use ordinal index
        batch_index = tx.get("_batch_index", idx)
        description = tx.get("description", "")
        amount = tx.get("amount", 0)
        
        # Truncate description to first 120 characters for better context (was 80)
        if len(description) > 120:
            description = description[:120] + "..."
        
        tx_list.append(f'  {{"id": "{batch_index}", "description": "{description}", "amount": {amount}}}')
    
    transactions_json = "[\n" + ",\n".join(tx_list) + "\n]"
    
    prompt = f"""You are a financial transaction classifier. Analyze each transaction and assign it to ONE category from this list:

{category_list}

Rules for classification:
- Use transaction description and amount to determine the most appropriate category
- Match the EXACT category name from the list above
- Common patterns:
   * UPI/ACH with merchant names → match to merchant type (e.g., Spotify→Entertainment, Zomato→Dining Out)
  * Salary/Income keywords → Salary category
  * Rent/Housing keywords → Rent category
  * Grocery stores (Zepto, BigBasket, etc.) → Groceries
  * Travel/Transport (Uber, Ola, etc.) → Transportation
  * Utilities (electricity, water, phone bills) → Utilities

Transactions to classify:
{transactions_json}

Respond with ONLY valid JSON mapping transaction IDs to category names:
{{"0": "Category Name", "1": "Category Name", ...}}

Use exact category names from the list provided."""
    
    return prompt


def build_structured_batch_classification_prompt(transactions: List[Dict[str, Any]]) -> str:
    """
    Build a structured batch classification prompt that returns rich metadata.
    
    This is the improved prompt format that returns:
    - name: high-level category name (e.g., "Transport", "Investments")
    - category_type: NEEDS, WANTS, SAVINGS, TRANSFER, INCOME
    - icon: icon identifier (transport, utility, restaurant, entertainment, chart_line, transfer, money_in)
    - color: color identifier (blue, orange, green, grey)
    - description: short explanation (max 10 words)
    
    Args:
        transactions: List of transaction dictionaries
    
    Returns:
        Prompt string requesting structured batch classification in JSON format
    """
    # Build transaction list for prompt
    tx_list = []
    for idx, tx in enumerate(transactions):
        batch_index = tx.get("_batch_index", idx)
        description = tx.get("description", "")
        amount = tx.get("amount", 0)
        merchant = tx.get("merchant_name", "")
        
        # Truncate description to first 100 characters
        if len(description) > 100:
            description = description[:100] + "..."
        
        tx_list.append(f'  {{"id": "{batch_index}", "merchant": "{merchant}", "description": "{description}", "amount": {amount}}}')
    
    transactions_json = "[\n" + ",\n".join(tx_list) + "\n]"
    
    prompt = f"""You are an expert financial transaction classifier. Analyze each transaction and return structured classification data.

For each transaction, determine:
1. **name**: High-level category name (e.g., "Transport", "Groceries", "Entertainment", "Utilities", "Investments", "Salary", "Rent", etc.)
2. **category_type**: One of: NEEDS (essential), WANTS (discretionary), SAVINGS (for savings), TRANSFER (bank transfer), INCOME (money in)
3. **icon**: Appropriate icon identifier from: transport, utility, restaurant, entertainment, chart_line, transfer, money_in, groceries, healthcare, shopping
4. **color**: Color identifier from: blue, orange, green, grey
5. **description**: Brief explanation of the classification (max 10 words)

Classification rules:
- Spotify, Netflix, YouTube → Entertainment (WANTS, entertainment, blue)
- Zomato, Swiggy, DoorDash → Dining Out (WANTS, restaurant, orange)
- Uber, Ola, Meru → Transport (NEEDS, transport, green)
- Zepto, BigBasket, Amazon Fresh → Groceries (NEEDS, groceries, green)
- Electricity, Water, Internet bills → Utilities (NEEDS, utility, grey)
- Amazon, Flipkart, shopping stores → Shopping (WANTS, shopping, blue)
- Hospital, Doctor, Pharmacy → Healthcare (NEEDS, healthcare, green)
- Stock brokers, Crypto, Mutual funds → Investments (SAVINGS, chart_line, grey)
- Salary, Income, Refunds → Income (INCOME, money_in, green)
- Bank transfers, Account transfers → Bank Transfer (TRANSFER, transfer, grey)

Transactions to classify:
{transactions_json}

Respond with ONLY a valid JSON array where each element has the structure:
[
  {{"id": "0", "name": "Category Name", "category_type": "NEEDS/WANTS/SAVINGS/TRANSFER/INCOME", "icon": "icon_name", "color": "color_name", "description": "Short explanation"}},
  {{"id": "1", "name": "Category Name", "category_type": "NEEDS/WANTS/SAVINGS/TRANSFER/INCOME", "icon": "icon_name", "color": "color_name", "description": "Short explanation"}},
  ...
]

Ensure descriptions are concise (max 10 words). Use exact icon and color names from the provided options."""
    
    return prompt


def build_classification_prompt(transaction: Dict[str, Any], categories: Optional[list] = None) -> str:
    """
    Build a prompt for AI classification.
    
    Args:
        transaction: Transaction data
        categories: List of available category names
    
    Returns:
        Prompt string
    """
    description = transaction.get("description", "")
    amount = transaction.get("amount", 0)
    merchant = transaction.get("merchant_name", "")
    
    if categories:
        # Use actual user categories
        category_list = "\n".join([f"- {cat}" for cat in sorted(categories) if cat != "Uncategorized"])
        prompt = f"""Classify the following financial transaction into ONE of these exact categories:
{category_list}

Transaction details:
- Description: {description}
- Amount: ₹{amount:,.2f}
"""
    else:
        # Fallback to generic categories
        prompt = f"""Classify the following transaction into one of these categories:
- Salary
- Rent
- Groceries
- Utilities
- Transportation
- Healthcare
- Dining Out
- Entertainment
- Shopping
- Travel
- Investments
- Savings
- Bank Transfer
- Credit Card Payment

Transaction details:
- Description: {description}
- Amount: ₹{amount:,.2f}
"""
    
    if merchant:
        prompt += f"- Merchant: {merchant}\n"
    
    prompt += "\nRespond with ONLY the exact category name from the list above."
    
    return prompt
