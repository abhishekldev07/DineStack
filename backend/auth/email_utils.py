from fastapi_mail import FastMail, MessageSchema
from auth.email_config import conf
import logging

logger = logging.getLogger(__name__)

async def send_email(email: str, subject: str, body: str):

    message = MessageSchema(
        subject=subject,
        recipients=[email],
        body=body,
        subtype="plain"
    )

    fm = FastMail(conf)

    try:
        await fm.send_message(message)
        logger.info("Sent email to %s with subject %s", email, subject)
    except Exception as error:
        logger.exception("Failed to send email to %s with subject %s", email, subject)
        raise error


async def send_reset_email(email: str, reset_link: str):
    await send_email(
        email=email,
        subject="DineStack Password Reset",
        body=f"""
Click the link below to reset your password:

{reset_link}
"""
    )


async def send_verification_email(email: str, verification_link: str):
    await send_email(
        email=email,
        subject="Verify your DineStack email",
        body=f"""
Welcome to DineStack.

Please verify your email by clicking the link below:

{verification_link}

If you did not create this account, you can ignore this email.
"""
    )