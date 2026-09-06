import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

def send_reset_otp_email(to_email: str, otp: str):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
    from_name = os.getenv("SMTP_FROM_NAME", "NEXUS")

    if not all([smtp_host, smtp_port, smtp_user, smtp_pass]):
        logger.error("SMTP credentials are not fully configured.")
        return False

    msg = MIMEMultipart()
    msg['From'] = f"{from_name} <{from_email}>"
    msg['To'] = to_email
    msg['Subject'] = "NEXUS Password Reset OTP"

    body = f"""NEXUS
Password Recovery

Your verification OTP is:

{otp}

This OTP is valid for 10 minutes.

If you did not request a password reset, you can safely ignore this email.

For security reasons, do not share this OTP with anyone.
"""
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send email via SMTP. Check credentials and network. Error logged securely.")
        # DO NOT LOG SMTP CREDENTIALS or FULL EXCEPTION TRACE if it might leak things.
        return False
