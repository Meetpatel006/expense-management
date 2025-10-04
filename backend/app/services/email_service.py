from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from app.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USER,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.EMAILS_FROM_EMAIL,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_HOST,
            MAIL_FROM_NAME=settings.EMAILS_FROM_NAME,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True
        )

    async def send_email(self, email: str, subject: str, body: str):
        """Send email helper"""
        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=body,
            subtype="html"
        )

        fm = FastMail(self.conf)
        await fm.send_message(message)

    async def send_new_user_credentials(self, email: str, name: str, password: str):
        """Send credentials to new user"""
        subject = "Welcome to Expense Management - Your Account Details"
        body = f"""
        <html>
        <body>
            <h2>Welcome to Expense Management System, {name}!</h2>
            <p>Your account has been created successfully.</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Temporary Password:</strong> {password}</p>
            <p>Please log in and change your password immediately.</p>
            <br>
            <p>Best regards,<br>Expense Management Team</p>
        </body>
        </html>
        """
        await self.send_email(email, subject, body)

    async def send_new_password(self, email: str, name: str, password: str):
        """Send new password to user"""
        subject = "Expense Management - New Password"
        body = f"""
        <html>
        <body>
            <h2>Hello {name},</h2>
            <p>A new password has been generated for your account.</p>
            <p><strong>New Password:</strong> {password}</p>
            <p>Please log in and change your password immediately.</p>
            <br>
            <p>Best regards,<br>Expense Management Team</p>
        </body>
        </html>
        """
        await self.send_email(email, subject, body)

    async def send_password_reset_email(self, email: str, name: str, token: str):
        """Send password reset link"""
        subject = "Expense Management - Password Reset"
        reset_link = f"http://localhost:3000/reset-password?token={token}"  # Adjust URL as needed

        body = f"""
        <html>
        <body>
            <h2>Hello {name},</h2>
            <p>You have requested to reset your password.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_link}">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <br>
            <p>Best regards,<br>Expense Management Team</p>
        </body>
        </html>
        """
        await self.send_email(email, subject, body)

    async def send_approval_notification(self, expense, approver_id):
        """Send notification to approver"""
        from app.models.user import User

        # Get approver (this would need db access, simplified for now)
        # approver = db.query(User).filter(User.id == approver_id).first()

        subject = f"Expense Approval Required - {expense.description[:50]}..."
        body = f"""
        <html>
        <body>
            <h2>Expense Approval Request</h2>
            <p>You have a new expense to approve:</p>
            <ul>
                <li><strong>Description:</strong> {expense.description}</li>
                <li><strong>Amount:</strong> {expense.amount} {expense.currency}</li>
                <li><strong>Category:</strong> {expense.category.value}</li>
                <li><strong>Employee:</strong> {expense.employee.name}</li>
            </ul>
            <p>Please log in to the system to review and approve/reject this expense.</p>
            <br>
            <p>Best regards,<br>Expense Management Team</p>
        </body>
        </html>
        """
        # await self.send_email(approver.email, subject, body)

    async def send_expense_status_notification(self, expense, status: str):
        """Send status notification to employee"""
        subject = f"Expense {status.title()} - {expense.description[:50]}..."

        body = f"""
        <html>
        <body>
            <h2>Expense Status Update</h2>
            <p>Your expense has been <strong>{status}</strong>:</p>
            <ul>
                <li><strong>Description:</strong> {expense.description}</li>
                <li><strong>Amount:</strong> {expense.amount} {expense.currency}</li>
                <li><strong>Category:</strong> {expense.category.value}</li>
            </ul>
            <p>Please log in to the system for more details.</p>
            <br>
            <p>Best regards,<br>Expense Management Team</p>
        </body>
        </html>
        """
        # await self.send_email(expense.employee.email, subject, body)