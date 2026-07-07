"""
NESYA — Authentication Router  /api/v1/auth/
"""
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    ForgotPasswordRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


# ── Registration ──────────────────────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED,
             summary="Register a new user account")
async def register(
    body: UserRegister,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.register_user(
        db,
        full_name=body.full_name,
        email=body.email,
        password=body.password,
        request=request,
    )


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse,
             summary="Authenticate and receive JWT tokens")
async def login(
    body: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.login_user(
        db,
        email=body.email,
        password=body.password,
        request=request,
    )


# ── Token Refresh ─────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=AccessTokenResponse,
             summary="Issue a new access token from a valid refresh token")
async def refresh(
    body: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.refresh_access_token(
        db, refresh_token=body.refresh_token, request=request
    )


# ── Logout ────────────────────────────────────────────────────────────────────
@router.post("/logout", response_model=MessageResponse,
             summary="Revoke the current refresh token (logout)")
async def logout(
    body: RefreshTokenRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.logout_user(
        db,
        refresh_token=body.refresh_token,
        user_id=current_user.id,
        request=request,
    )


# ── Current User ──────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse,
            summary="Return the currently authenticated user")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Email Verification ────────────────────────────────────────────────────────
@router.post("/verify-email", response_model=MessageResponse,
             summary="Consume an email verification token")
async def verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.verify_email(db, body.token)


# ── Forgot Password ───────────────────────────────────────────────────────────
@router.post("/forgot-password", response_model=MessageResponse,
             summary="Send a password-reset email")
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.send_password_reset(db, body.email, request)


# ── Reset Password ────────────────────────────────────────────────────────────
@router.post("/reset-password", response_model=MessageResponse,
             summary="Consume a reset token and set a new password")
async def reset_password(
    body: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.reset_password(
        db,
        token=body.token,
        new_password=body.new_password,
        request=request,
    )


# ── OAuth — Initiate ──────────────────────────────────────────────────────────
@router.get("/oauth/{provider}",
            summary="Redirect to OAuth provider (google | github | microsoft)")
async def oauth_redirect(provider: str):
    url = auth_service.get_oauth_redirect_url(provider)
    return RedirectResponse(url=url, status_code=302)


# ── OAuth — Callback ──────────────────────────────────────────────────────────
@router.get("/oauth/{provider}/callback",
            summary="Handle OAuth provider callback")
async def oauth_callback(
    provider: str,
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    tokens = await auth_service.handle_oauth_callback(
        db, provider=provider, code=code, request=request
    )
    # Pass tokens to the SPA via URL fragment (never in query string)
    redirect = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"#access_token={tokens.access_token}"
        f"&refresh_token={tokens.refresh_token}"
        f"&token_type=bearer"
    )
    return RedirectResponse(url=redirect, status_code=302)
