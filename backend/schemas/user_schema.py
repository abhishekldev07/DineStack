from pydantic import BaseModel, EmailStr, Field
from typing import Literal


class UserCreate(BaseModel):

    username: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=50)

    role: Literal[
        "customer",
        "staff",
        "admin"
    ] = "customer"


class UserLogin(BaseModel):

    email: EmailStr
    password: str


class ResendVerification(BaseModel):

    email: EmailStr
    
class ResetPassword(BaseModel):

    new_password: str = Field(min_length=6, max_length=50)


class ChangePassword(BaseModel):

    current_password: str = Field(min_length=1, max_length=50)
    new_password: str = Field(min_length=6, max_length=50)


class AuthUser(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: Literal["customer", "staff", "admin"]


class AuthSessionResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AuthUser


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str