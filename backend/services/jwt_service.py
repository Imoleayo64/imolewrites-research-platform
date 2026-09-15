from datetime import datetime, timedelta
from jose import jwt, JWTError

from backend.core.config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(data: dict):
    payload = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload.update({"exp": expire})

    return jwt.encode(
        payload,
        settings.SECRET_KEY or "development-secret",
        algorithm=ALGORITHM
    )

# ==========================================
# NEW: decode_access_token function
# ==========================================
def decode_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY or "development-secret",
            algorithms=[ALGORITHM]
        )
        # Extract the email address (stored in the 'sub' field)
        email: str = payload.get("sub")
        return email
    except JWTError:
        # If the token is invalid or expired, return None to trigger an unauthorized error
        return None