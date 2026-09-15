from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.crud.users import get_user_by_email
from backend.services.security import verify_password
from backend.services.jwt_service import create_access_token, decode_access_token
from backend.database.session import get_db

# This tells FastAPI where to look for the security token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def login_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)

    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return {
        "access_token": create_access_token(
            {"sub": user.email}
        ),
        "token_type": "bearer"
    }

# ==========================================
# NEW: get_current_user function
# ==========================================
def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Decode the token to extract the user's email
    email = decode_access_token(token)
    if not email:
        raise credentials_exception
        
    # 2. Find the user in the database using that email
    user = get_user_by_email(db, email=email)
    if not user:
        raise credentials_exception
        
    # 3. Return the fully authenticated user profile
    return user