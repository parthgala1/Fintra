"""
Transfer and direction detection heuristics.

Provides regex-based rules for determining:
1. Whether a transaction is a transfer (between own accounts)
2. Whether a transaction is income vs. expense
3. Whether a transaction is ambiguous and needs higher-confidence AI classification

These are Stage 1 of the hierarchical classification pipeline.
"""

import re
from dataclasses import dataclass
from enum import Enum


class DetectionConfidence(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True)
class DirectionDetectionResult:
    """Result from the direction detection stage."""
    direction_type: str               # income / expense / transfer / refund / adjustment
    confidence: DetectionConfidence
    matched_rule: str | None = None   # Human-readable description of which rule triggered


# ── Transfer keywords / patterns ─────────────────────────────────────────────
# Ordered roughly from highest to lowest specificity.

_TRANSFER_EXACT_PHRASES: list[str] = [
    "bank transfer",
    "inter account transfer",
    "own account transfer",
    "account transfer",
    "wire transfer",
    "internal transfer",
    "fund transfer",
    "neft",
    "rtgs",
    "imps",
    "upi to self",
    "credit card payment",
    "bill pay - cc",
    "bill payment - credit",
    "cc payment",
    "card payment",
    "pay bill",
]

_TRANSFER_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(transfer|trf|xfer)\b", re.IGNORECASE),
    re.compile(r"\bneft\b", re.IGNORECASE),
    re.compile(r"\brtgs\b", re.IGNORECASE),
    re.compile(r"\bimps\b", re.IGNORECASE),
    re.compile(r"\b(upi|gpay|phonepe|paytm|bhim)\b.*\bself\b", re.IGNORECASE),
    re.compile(r"\bcc\s*(bill|pay)\b", re.IGNORECASE),
    re.compile(r"\bcredit\s*card\s*payment\b", re.IGNORECASE),
    re.compile(r"\bfund\s*transfer\b", re.IGNORECASE),
    re.compile(r"\bown\s*account\b", re.IGNORECASE),
]

# ── Income keywords / patterns ────────────────────────────────────────────────

_INCOME_EXACT_PHRASES: list[str] = [
    "salary",
    "wages",
    "payroll",
    "paycheck",
    "direct deposit",
    "employer",
    "freelance payment",
    "invoice payment",
    "dividend",
    "interest earned",
    "interest credit",
    "rental income",
    "tax refund",
    "cashback",
    "cash back",
    "refund",
    "reversal",
]

_INCOME_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(salary|sal|payroll|wages)\b", re.IGNORECASE),
    re.compile(r"\bdirect\s*deposit\b", re.IGNORECASE),
    re.compile(r"\b(dividend|dividends)\b", re.IGNORECASE),
    re.compile(r"\binterest\s+(earned|credit|income)\b", re.IGNORECASE),
    re.compile(r"\btax\s+refund\b", re.IGNORECASE),
    re.compile(r"\b(cashback|cash\s*back)\b", re.IGNORECASE),
    re.compile(r"\b(refund|reversal|reversal\s*of)\b", re.IGNORECASE),
    re.compile(r"\b(rental\s+income|rent\s+received)\b", re.IGNORECASE),
    re.compile(r"\b(freelance|consulting)\s*(payment|income|fee)s?\b", re.IGNORECASE),
]

# Phrases that suggest a *possible* income but could be ambiguous
_AMBIGUOUS_INCOME_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b(credit|cr)\b", re.IGNORECASE),
    re.compile(r"\bdeposit\b", re.IGNORECASE),
]


def _normalize(text: str) -> str:
    """Lowercase + strip extra whitespace."""
    return re.sub(r"\s+", " ", text.strip().lower())


def detect_direction(description: str, amount: float, legacy_transaction_type: str | None = None) -> DirectionDetectionResult:
    """
    Stage 1: Determine transaction direction from description and amount.

    Heuristic priority:
    1. Exact phrase match (transfer keywords)  → transfer / HIGH confidence
    2. Regex pattern match (transfer)           → transfer / HIGH confidence
    3. Exact phrase match (income keywords)     → income / HIGH confidence
    4. Regex pattern match (income)             → income / MEDIUM confidence
    5. Amount < 0  (debit)                      → expense / MEDIUM confidence
    6. Amount > 0  (credit) without clear signal → income / LOW confidence (ambiguous)
    7. Fallback to legacy transaction_type if provided
    8. Default: expense / LOW confidence

    Args:
        description:            Normalized transaction description.
        amount:                 Transaction amount (positive = credit, negative = debit).
        legacy_transaction_type: Optional legacy TransactionType value ('income'/'expense'/'transfer').

    Returns:
        DirectionDetectionResult
    """
    normalized = _normalize(description)

    # ── 1. Exact phrase transfer check ───────────────────────────────────────
    for phrase in _TRANSFER_EXACT_PHRASES:
        if phrase in normalized:
            return DirectionDetectionResult(
                direction_type="transfer",
                confidence=DetectionConfidence.HIGH,
                matched_rule=f"exact_phrase:{phrase}",
            )

    # ── 2. Regex transfer check ───────────────────────────────────────────────
    for pattern in _TRANSFER_PATTERNS:
        m = pattern.search(normalized)
        if m:
            return DirectionDetectionResult(
                direction_type="transfer",
                confidence=DetectionConfidence.HIGH,
                matched_rule=f"regex_transfer:{pattern.pattern}",
            )

    # ── 3. Exact phrase income check ─────────────────────────────────────────
    for phrase in _INCOME_EXACT_PHRASES:
        if phrase in normalized:
            direction = "refund" if "refund" in phrase or "reversal" in phrase else "income"
            return DirectionDetectionResult(
                direction_type=direction,
                confidence=DetectionConfidence.HIGH,
                matched_rule=f"exact_phrase:{phrase}",
            )

    # ── 4. Regex income check ─────────────────────────────────────────────────
    for pattern in _INCOME_PATTERNS:
        m = pattern.search(normalized)
        if m:
            direction = "refund" if ("refund" in pattern.pattern.lower() or "reversal" in pattern.pattern.lower()) else "income"
            return DirectionDetectionResult(
                direction_type=direction,
                confidence=DetectionConfidence.MEDIUM,
                matched_rule=f"regex_income:{pattern.pattern}",
            )

    # ── 5. Amount-based heuristic ─────────────────────────────────────────────
    if amount < 0:
        return DirectionDetectionResult(
            direction_type="expense",
            confidence=DetectionConfidence.MEDIUM,
            matched_rule="amount_negative",
        )

    if amount > 0:
        # Check ambiguous credit keywords
        for pattern in _AMBIGUOUS_INCOME_PATTERNS:
            if pattern.search(normalized):
                return DirectionDetectionResult(
                    direction_type="income",
                    confidence=DetectionConfidence.LOW,
                    matched_rule=f"ambiguous_credit:{pattern.pattern}",
                )
        # Positive amount but no clear signal — still likely income, but low confidence
        return DirectionDetectionResult(
            direction_type="income",
            confidence=DetectionConfidence.LOW,
            matched_rule="amount_positive_fallback",
        )

    # ── 6. Legacy transaction_type fallback ───────────────────────────────────
    if legacy_transaction_type:
        lt = legacy_transaction_type.lower()
        if lt == "income":
            return DirectionDetectionResult(
                direction_type="income",
                confidence=DetectionConfidence.LOW,
                matched_rule="legacy_transaction_type",
            )
        if lt == "transfer":
            return DirectionDetectionResult(
                direction_type="transfer",
                confidence=DetectionConfidence.LOW,
                matched_rule="legacy_transaction_type",
            )

    # ── 7. Final fallback ─────────────────────────────────────────────────────
    return DirectionDetectionResult(
        direction_type="expense",
        confidence=DetectionConfidence.LOW,
        matched_rule="default_fallback",
    )


def is_transfer(description: str, amount: float, legacy_transaction_type: str | None = None) -> bool:
    """Convenience wrapper — returns True if the transaction is a transfer."""
    result = detect_direction(description, amount, legacy_transaction_type)
    return result.direction_type == "transfer"


def is_income(description: str, amount: float, legacy_transaction_type: str | None = None) -> bool:
    """Convenience wrapper — returns True if the transaction is income or a refund/reversal."""
    result = detect_direction(description, amount, legacy_transaction_type)
    return result.direction_type in ("income", "refund", "adjustment")
