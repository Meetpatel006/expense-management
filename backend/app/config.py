from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Expense Management API"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./expense_management.db"
    # For PostgreSQL: "postgresql://user:password@localhost/dbname"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@expensemanagement.com"
    EMAILS_FROM_NAME: str = "Expense Management"

    # OCR
    OCR_ENGINE: str = "tesseract"  # or "google_vision"
    GOOGLE_VISION_CREDENTIALS: str = ""  # Path to JSON credentials

    # External APIs
    CURRENCY_API_BASE_URL: str = "https://api.exchangerate-api.com/v4/latest"
    COUNTRIES_API_URL: str = "https://restcountries.com/v3.1/all"

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()