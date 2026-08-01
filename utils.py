import secrets
import string
from datetime import datetime,timedelta

ALPHABET = string.ascii_letters + string.digits

def generate_slug(length=8):
    return "".join(
        secrets.choice(ALPHABET)
        for _ in range(length)
    )

def generate_token():
    return secrets.token_urlsafe(32)

def get_expiry_datetime(expiry_str):
    now = datetime.now()
    if expiry_str == "never" or not expiry_str:
        return None
    expiry_map = {
        "10m": timedelta(minutes=10),
        "1h": timedelta(hours=1),
        "1d": timedelta(days=1),
        "1w": timedelta(weeks=1),
        "1m": timedelta(days=30)
    }
    delta = expiry_map.get(expiry_str)
    if not delta:
        return None
    return now + delta

def is_expired(exp_time):
    if not exp_time:
        return False
    print(datetime.now(), exp_time)
    return datetime.now() >  exp_time 