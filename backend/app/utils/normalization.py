import hashlib
import re
from typing import Optional

import phonenumbers


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    email_clean = email.strip().lower()
    # rudimentary validation
    if "@" not in email_clean or "." not in email_clean.split("@")[-1]:
        return None
    return email_clean


def normalize_and_hash_email(email: Optional[str]) -> Optional[str]:
    normalized = normalize_email(email)
    if not normalized:
        return None
    return sha256_hex(normalized)


def _digits_only(value: str) -> str:
    return re.sub(r"\D+", "", value)


def normalize_phone_to_cc_digits(phone: Optional[str], default_region: str = "EC") -> Optional[str]:
    """Return phone as digits including country code (no plus), suitable for hashing per Meta spec.

    Examples:
      +593987654321 -> 593987654321
      0987654321 (EC) -> 593987654321
    """
    if not phone:
        return None
    phone_str = phone.strip()
    try:
        if phone_str.startswith("+"):
            parsed = phonenumbers.parse(phone_str, None)
        else:
            parsed = phonenumbers.parse(phone_str, default_region)
        if not phonenumbers.is_valid_number(parsed):
            return None
        e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        return _digits_only(e164)
    except Exception:
        # Fallback best-effort normalization
        digits = _digits_only(phone_str)
        if digits.startswith("0") and len(digits) >= 10 and default_region == "EC":
            # convert 09xxxxxxxx to 5939xxxxxxxx
            return f"593{digits[1:]}"
        if digits.startswith("593"):
            return digits
        # Unknown; return None to avoid sending garbage
        return None


def normalize_and_hash_phone(phone: Optional[str], default_region: str = "EC") -> Optional[str]:
    digits = normalize_phone_to_cc_digits(phone, default_region=default_region)
    if not digits:
        return None
    return sha256_hex(digits)


