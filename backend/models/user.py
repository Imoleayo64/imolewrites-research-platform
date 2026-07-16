from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class User(BaseModel):
    id: str
    full_name: str
    email: EmailStr
