import os
import logging
import resend

logger = logging.getLogger(__name__)

# Initialize the Resend API client using your Railway variable
resend.api_key = os.getenv("RESEND_API_KEY")

async def send_email(email: str, subject: str, body: str):
    try:
        # Resend free tier gives you onboarding@resend.dev to test with
        # Once you verify your domain, you can change this to your custom domain
        from_email = "DineStack <no-reply@dinestack.abrdns.com>"
        
        # Call the Resend HTTP API to deliver the mail
        response = resend.Emails.send({
            "from": from_email,
            "to": [email],
            "subject": subject,
            "text": body  # Using 'text' since your original emails were plain-text string templates
        })
        
        logger.info("Sent email via Resend API to %s with subject %s. ID: %s", email, subject, getattr(response, 'id', 'N/A'))
    except Exception as error:
        logger.exception("Failed to send email via Resend API to %s with subject %s", email, subject)
        # We do NOT raise the error here anymore. 
        # Since it runs in a background task, raising it does nothing but print a trace.
        # Keeping it quiet here ensures your background pool processes smoothly.

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