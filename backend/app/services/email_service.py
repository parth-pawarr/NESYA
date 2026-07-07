"""
NESYA — Email Service
Sends transactional emails via SMTP (or prints to console when MAIL_SUPPRESS_SEND=true).
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Thin SMTP wrapper with HTML email templates branded for NESYA."""

    # ── Public API ────────────────────────────────────────────────────────────
    async def send_verification_email(self, email: str, name: str, token: str) -> None:
        url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        await self._send(
            to=email,
            subject="Verify your NESYA account",
            html=self._verification_template(name, url),
        )

    async def send_password_reset_email(self, email: str, name: str, token: str) -> None:
        url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        await self._send(
            to=email,
            subject="Reset your NESYA password",
            html=self._reset_template(name, url),
        )

    # ── Internals ─────────────────────────────────────────────────────────────
    async def _send(self, to: str, subject: str, html: str) -> None:
        if settings.MAIL_SUPPRESS_SEND:
            logger.info(
                "\n%s\n📧 EMAIL SUPPRESSED → %s\nSubject: %s\n%s\n%s",
                "=" * 60, to, subject, html[:400], "=" * 60,
            )
            return

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
            msg["To"] = to
            msg.attach(MIMEText(html, "html", "utf-8"))

            with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=15) as srv:
                if settings.MAIL_STARTTLS:
                    srv.starttls()
                if settings.MAIL_USERNAME:
                    srv.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
                srv.sendmail(settings.MAIL_FROM, to, msg.as_string())

            logger.info("Email sent → %s (%s)", to, subject)
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to, exc)

    # ── HTML Templates ────────────────────────────────────────────────────────
    def _base_template(self, content: str) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>NESYA FIR Assistant</title>
</head>
<body style="margin:0;padding:0;background:#0b0f14;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#0b0f14;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="background:#161b22;border-radius:16px;border:1px solid rgba(148,163,184,0.14);
                    overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#062b23,#0b4f42);
                     padding:32px 40px;text-align:center;
                     border-bottom:1px solid rgba(16,163,127,0.2);">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:40px;height:40px;
                          background:linear-gradient(135deg,#10a37f,#0f766e);
                          border-radius:10px;display:inline-block;
                          line-height:40px;text-align:center;font-size:20px;">🛡️</div>
              <span style="font-size:22px;font-weight:800;
                           background:linear-gradient(135deg,#d1fae5,#99f6e4);
                           -webkit-background-clip:text;
                           -webkit-text-fill-color:transparent;">NESYA</span>
            </div>
            <p style="margin:8px 0 0;color:#6ee7c8;font-size:12px;
                      letter-spacing:1px;text-transform:uppercase;">
              AI FIR Legal Assistant
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            {content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid rgba(148,163,184,0.1);
                     text-align:center;">
            <p style="color:#4b5563;font-size:12px;margin:0;">
              This email was sent by NESYA FIR Assistant. If you did not request this,
              please ignore this message.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    def _verification_template(self, name: str, url: str) -> str:
        content = f"""
<h2 style="color:#f3f4f6;font-size:24px;font-weight:700;margin:0 0 8px;">
  Verify your email address
</h2>
<p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px;">
  Hi {name}, welcome to NESYA! Click the button below to verify your email
  address and activate your account.
</p>
<div style="text-align:center;margin:0 0 28px;">
  <a href="{url}"
     style="display:inline-block;padding:14px 36px;
            background:linear-gradient(135deg,#10a37f,#0f766e);
            color:#ffffff;font-weight:600;font-size:15px;
            border-radius:10px;text-decoration:none;
            box-shadow:0 10px 20px rgba(16,163,127,0.25);">
    Verify Email Address
  </a>
</div>
<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
  This link expires in <strong style="color:#9ca3af;">24 hours</strong>.
  If the button doesn't work, copy and paste this URL into your browser:<br/>
  <a href="{url}" style="color:#10a37f;word-break:break-all;">{url}</a>
</p>"""
        return self._base_template(content)

    def _reset_template(self, name: str, url: str) -> str:
        content = f"""
<h2 style="color:#f3f4f6;font-size:24px;font-weight:700;margin:0 0 8px;">
  Reset your password
</h2>
<p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 28px;">
  Hi {name}, we received a request to reset your NESYA password.
  Click below to choose a new password.
</p>
<div style="text-align:center;margin:0 0 28px;">
  <a href="{url}"
     style="display:inline-block;padding:14px 36px;
            background:linear-gradient(135deg,#10a37f,#0f766e);
            color:#ffffff;font-weight:600;font-size:15px;
            border-radius:10px;text-decoration:none;
            box-shadow:0 10px 20px rgba(16,163,127,0.25);">
    Reset Password
  </a>
</div>
<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
  This link expires in <strong style="color:#9ca3af;">1 hour</strong>.
  If you did not request a password reset, you can safely ignore this email.
  Your password will not be changed.
</p>"""
        return self._base_template(content)
