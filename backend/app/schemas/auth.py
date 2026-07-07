"""
NESYA — Pydantic v2 schemas for the Authentication API.
"""
import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ── Registration ──────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255, examples=["Ravi Kumar"])
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(...)

    @field_validator("password")
    @classmethod
    def _validate_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Must contain at least one digit.")
        if not re.search(r'[!@#$%^&*()\-_=+\[\]{}|;:\'",.<>?/\\`~]', v):
            raise ValueError("Must contain at least one special character.")
        return v

    @model_validator(mode="after")
    def _passwords_match(self) -> "UserRegister":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


# ── Login ─────────────────────────────────────────────────────────────────────
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


# ── User Response ─────────────────────────────────────────────────────────────
class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    auth_provider: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None


# ── Token Responses ───────────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int   # seconds until access token expires
    user: UserResponse


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── Password Flows ────────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def _validate_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Must contain at least one lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Must contain at least one digit.")
        return v

    @model_validator(mode="after")
    def _passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


# ── Email Verification ────────────────────────────────────────────────────────
class VerifyEmailRequest(BaseModel):
    token: str


# ── Generic Success Response ──────────────────────────────────────────────────
class MessageResponse(BaseModel):
    message: str
    success: bool = True
