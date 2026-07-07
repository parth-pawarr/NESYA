"""
NESYA — Auth Service
Business logic for: registration, login, token refresh, logout,
email verification, password reset, and OAuth.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode
from uuid import UUID

import httpx
from fastapi import HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_secure_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.auth_tokens import (
    EmailVerificationToken,
    OAuthAccount,
    PasswordResetToken,
    RefreshToken,
)
from app.models.user import AuthProvider, User
from app.schemas.auth import TokenResponse, UserResponse
from app.services.audit_service import log_audit
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)
_email_svc = EmailService()


class AuthService:

    # ── Registration ──────────────────────────────────────────────────────────
    async def register_user(self, db: AsyncSession, *, full_name: str, email: str,
                            password: str, request: Request) -> dict:
        """Create a new user account and send a verification email."""
        normalized_email = email.lower().strip()

        # Email uniqueness check
        existing = (await db.execute(select(User).where(User.email == normalized_email))).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="An account with this email already exists.")

        user = User(
            email=normalized_email,
            hashed_password=hash_password(password),
            full_name=full_name.strip(),
            auth_provider=AuthProvider.LOCAL,
            is_active=True,
            is_verified=settings.SKIP_EMAIL_VERIFY,  # Auto-verify in dev mode
        )
        db.add(user)
        await db.flush()   # Assign user.id without committing

        # Verification token (plaintext stored — not sensitive like a password)
        plain_token = generate_secure_token(48)
        db.add(EmailVerificationToken(
            token=plain_token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        ))
        await db.commit()
        await db.refresh(user)

        await _email_svc.send_verification_email(user.email, user.full_name, plain_token)
        await log_audit(db, "user.register", request=request, user_id=user.id, status="success")
        await db.commit()

        return {"message": "Registration successful. Please verify your email to continue."}

    # ── Login ─────────────────────────────────────────────────────────────────
    async def login_user(self, db: AsyncSession, *, email: str, password: str,
                         request: Request) -> TokenResponse:
        """Authenticate and return access + refresh tokens."""
        user = (await db.execute(
            select(User).where(User.email == email.lower().strip())
        )).scalar_one_or_none()

        if not user:
            # Explicitly return not found to support the automatic redirect to signup feature requested
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="User not found.")

        if not user.hashed_password or not verify_password(password, user.hashed_password):
            await log_audit(db, "user.login.failed", request=request, status="failure",
                            details={"email": email})
            await db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid email or password.")

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Account deactivated. Contact support.")

        if not user.is_verified and not settings.SKIP_EMAIL_VERIFY:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Please verify your email address before logging in.")

        tokens = await self._issue_tokens(db, user, request)

        await db.execute(
            update(User).where(User.id == user.id)
            .values(last_login_at=datetime.now(timezone.utc))
        )
        await log_audit(db, "user.login", request=request, user_id=user.id, status="success")
        await db.commit()

        return tokens

    # ── Token Refresh ─────────────────────────────────────────────────────────
    async def refresh_access_token(self, db: AsyncSession, *, refresh_token: str,
                                   request: Request) -> dict:
        """Validate a refresh token and issue a new access token (rotation-free)."""
        from app.core.security import decode_token

        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid token type.")

        user_id_str: Optional[str] = payload.get("sub")
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Malformed token payload.")

        token_hash = hash_token(refresh_token)
        db_token = (await db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked.is_(False),
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )).scalar_one_or_none()

        if not db_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Refresh token invalid or expired.")

        user = (await db.execute(
            select(User).where(User.id == UUID(user_id_str))
        )).scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="User not found or deactivated.")

        access_token = create_access_token({"sub": str(user.id), "email": user.email})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    # ── Logout ────────────────────────────────────────────────────────────────
    async def logout_user(self, db: AsyncSession, *, refresh_token: str,
                          user_id: UUID, request: Request) -> dict:
        """Revoke a refresh token (logout from current device)."""
        token_hash = hash_token(refresh_token)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash, RefreshToken.user_id == user_id)
            .values(revoked=True, revoked_at=datetime.now(timezone.utc))
        )
        await log_audit(db, "user.logout", request=request, user_id=user_id, status="success")
        await db.commit()
        return {"message": "Successfully logged out."}

    # ── Email Verification ────────────────────────────────────────────────────
    async def verify_email(self, db: AsyncSession, token: str) -> dict:
        """Consume an email verification token and activate the user."""
        db_token = (await db.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token == token,
                EmailVerificationToken.used.is_(False),
                EmailVerificationToken.expires_at > datetime.now(timezone.utc),
            )
        )).scalar_one_or_none()

        if not db_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Verification link is invalid or has expired.")

        await db.execute(
            update(EmailVerificationToken)
            .where(EmailVerificationToken.id == db_token.id)
            .values(used=True, used_at=datetime.now(timezone.utc))
        )
        await db.execute(
            update(User).where(User.id == db_token.user_id).values(is_verified=True)
        )
        await db.commit()
        return {"message": "Email verified successfully. You can now log in."}

    # ── Forgot Password ───────────────────────────────────────────────────────
    async def send_password_reset(self, db: AsyncSession, email: str,
                                  request: Request) -> dict:
        """Generate a password reset token and email it to the user."""
        user = (await db.execute(
            select(User).where(User.email == email.lower().strip())
        )).scalar_one_or_none()

        # Always return 200 — prevents email enumeration
        if not user or not user.is_active:
            return {"message": "If that email exists, a reset link has been sent."}

        # Invalidate any outstanding tokens for this user
        await db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.user_id == user.id,
                   PasswordResetToken.used.is_(False))
            .values(used=True, used_at=datetime.now(timezone.utc))
        )

        plain_token = generate_secure_token(48)
        db.add(PasswordResetToken(
            token_hash=hash_token(plain_token),
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        ))
        await db.commit()

        await _email_svc.send_password_reset_email(user.email, user.full_name, plain_token)
        await log_audit(db, "user.password_reset_requested", request=request,
                        user_id=user.id, status="success")
        await db.commit()

        return {"message": "If that email exists, a reset link has been sent."}

    # ── Reset Password ────────────────────────────────────────────────────────
    async def reset_password(self, db: AsyncSession, *, token: str,
                             new_password: str, request: Request) -> dict:
        """Consume a password reset token and update the user's password."""
        token_hash = hash_token(token)
        db_token = (await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used.is_(False),
                PasswordResetToken.expires_at > datetime.now(timezone.utc),
            )
        )).scalar_one_or_none()

        if not db_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Reset link is invalid or has expired.")

        now = datetime.now(timezone.utc)
        await db.execute(
            update(PasswordResetToken)
            .where(PasswordResetToken.id == db_token.id)
            .values(used=True, used_at=now)
        )
        await db.execute(
            update(User).where(User.id == db_token.user_id)
            .values(hashed_password=hash_password(new_password))
        )
        # Revoke ALL refresh tokens for this user (force re-login everywhere)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == db_token.user_id,
                   RefreshToken.revoked.is_(False))
            .values(revoked=True, revoked_at=now)
        )
        await log_audit(db, "user.password_reset", request=request,
                        user_id=db_token.user_id, status="success")
        await db.commit()
        return {"message": "Password reset successfully. You can now log in."}

    # ── OAuth — Redirect ──────────────────────────────────────────────────────
    def get_oauth_redirect_url(self, provider: str) -> str:
        """Return the provider's authorization URL."""
        if provider == "google":
            if not settings.GOOGLE_CLIENT_ID:
                raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED,
                                    detail="Google OAuth is not configured.")
            return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
                "client_id": settings.GOOGLE_CLIENT_ID,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": "openid email profile",
                "access_type": "offline",
                "prompt": "consent",
            })

        if provider == "github":
            if not settings.GITHUB_CLIENT_ID:
                raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED,
                                    detail="GitHub OAuth is not configured.")
            return "https://github.com/login/oauth/authorize?" + urlencode({
                "client_id": settings.GITHUB_CLIENT_ID,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
                "scope": "user:email",
            })

        if provider == "microsoft":
            if not settings.MICROSOFT_CLIENT_ID:
                raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED,
                                    detail="Microsoft OAuth is not configured.")
            return (
                f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}"
                "/oauth2/v2.0/authorize?" + urlencode({
                    "client_id": settings.MICROSOFT_CLIENT_ID,
                    "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
                    "response_type": "code",
                    "scope": "openid email profile",
                })
            )

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Unknown OAuth provider: {provider!r}")

    # ── OAuth — Callback ──────────────────────────────────────────────────────
    async def handle_oauth_callback(self, db: AsyncSession, *, provider: str,
                                    code: str, request: Request) -> TokenResponse:
        """Exchange the OAuth code for user info, upsert the user, return tokens."""
        user_info = await self._fetch_oauth_user_info(provider, code)

        provider_uid = str(user_info["id"])
        email = (user_info.get("email") or "").lower().strip()
        full_name = user_info.get("name") or user_info.get("login") or "OAuth User"
        avatar_url = user_info.get("avatar_url") or user_info.get("picture")

        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="OAuth provider did not return an email address.")

        # Check existing OAuth link
        oauth_account = (await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_user_id == provider_uid,
            )
        )).scalar_one_or_none()

        if oauth_account:
            user = (await db.execute(
                select(User).where(User.id == oauth_account.user_id)
            )).scalar_one()
        else:
            # Link to existing email account or create new
            user = (await db.execute(
                select(User).where(User.email == email)
            )).scalar_one_or_none()

            if not user:
                user = User(
                    email=email, full_name=full_name, avatar_url=avatar_url,
                    auth_provider=AuthProvider(provider),
                    is_active=True, is_verified=True,
                )
                db.add(user)
                await db.flush()

            db.add(OAuthAccount(
                user_id=user.id, provider=provider, provider_user_id=provider_uid,
            ))

        user.last_login_at = datetime.now(timezone.utc)
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url

        await db.commit()
        await db.refresh(user)
        await log_audit(db, f"user.oauth.{provider}", request=request,
                        user_id=user.id, status="success")
        await db.commit()

        return await self._issue_tokens(db, user, request)

    # ── Private Helpers ───────────────────────────────────────────────────────
    async def _issue_tokens(self, db: AsyncSession, user: User,
                            request: Request) -> TokenResponse:
        """Create JWT pair, persist hashed refresh token, return TokenResponse."""
        token_data = {"sub": str(user.id), "email": user.email}
        access_token = create_access_token(token_data)
        refresh_token_str = create_refresh_token(token_data)

        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")

        db.add(RefreshToken(
            token_hash=hash_token(refresh_token_str),
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            ip_address=ip,
            user_agent=ua,
        ))
        await db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )

    async def _fetch_oauth_user_info(self, provider: str, code: str) -> dict:
        """Exchange the auth code for user information from the OAuth provider."""
        async with httpx.AsyncClient(timeout=15) as client:
            if provider == "google":
                token_r = await client.post("https://oauth2.googleapis.com/token", data={
                    "code": code, "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                })
                token_r.raise_for_status()
                access = token_r.json()["access_token"]
                user_r = await client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {access}"},
                )
                user_r.raise_for_status()
                return user_r.json()

            if provider == "github":
                token_r = await client.post(
                    "https://github.com/login/oauth/access_token",
                    json={"client_id": settings.GITHUB_CLIENT_ID,
                          "client_secret": settings.GITHUB_CLIENT_SECRET,
                          "code": code,
                          "redirect_uri": settings.GITHUB_REDIRECT_URI},
                    headers={"Accept": "application/json"},
                )
                token_r.raise_for_status()
                access = token_r.json().get("access_token")
                hdrs = {"Authorization": f"Bearer {access}", "Accept": "application/json"}
                user_r = await client.get("https://api.github.com/user", headers=hdrs)
                user_r.raise_for_status()
                data = user_r.json()
                if not data.get("email"):
                    emails_r = await client.get("https://api.github.com/user/emails", headers=hdrs)
                    primary = next((e for e in emails_r.json() if e.get("primary")), None)
                    if primary:
                        data["email"] = primary["email"]
                return data

            if provider == "microsoft":
                tid = settings.MICROSOFT_TENANT_ID
                token_r = await client.post(
                    f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/token",
                    data={"code": code, "client_id": settings.MICROSOFT_CLIENT_ID,
                          "client_secret": settings.MICROSOFT_CLIENT_SECRET,
                          "redirect_uri": settings.MICROSOFT_REDIRECT_URI,
                          "grant_type": "authorization_code",
                          "scope": "openid email profile"},
                )
                token_r.raise_for_status()
                access = token_r.json()["access_token"]
                user_r = await client.get(
                    "https://graph.microsoft.com/v1.0/me",
                    headers={"Authorization": f"Bearer {access}"},
                )
                user_r.raise_for_status()
                ms = user_r.json()
                return {"id": ms.get("id"),
                        "email": ms.get("mail") or ms.get("userPrincipalName"),
                        "name": ms.get("displayName"),
                        "picture": None}

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Unknown provider: {provider!r}")


# Singleton instance
auth_service = AuthService()
