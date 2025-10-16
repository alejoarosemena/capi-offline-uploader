from datetime import datetime
from typing import Optional

from dateutil import parser as date_parser
from zoneinfo import ZoneInfo


def parse_date_to_unix_seconds(date_str: str, timezone_name: str = "America/Guayaquil") -> Optional[int]:
    """Parse various date formats (YYYY-MM-DD, D/M/YY, etc.) and return UNIX seconds at 12:00 (noon) local time.
    
    Using noon instead of midnight prevents timezone conversion issues where events 
    might shift to the previous day when viewed in different timezones.
    """
    if not date_str:
        return None
    tz = ZoneInfo(timezone_name)
    try:
        # First try strict YYYY-MM-DD for speed
        if len(date_str) == 10 and date_str[4] == "-" and date_str[7] == "-":
            dt = datetime.strptime(date_str, "%Y-%m-%d").replace(hour=12, minute=0, second=0, tzinfo=tz)
        else:
            # Generic parser for cases like 1/9/25 or 01-09-2025
            parsed = date_parser.parse(date_str, dayfirst=False, yearfirst=False)
            dt = datetime(parsed.year, parsed.month, parsed.day, hour=12, minute=0, second=0, tzinfo=tz)
        return int(dt.timestamp())
    except Exception:
        return None


