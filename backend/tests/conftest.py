import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, patch
from app.database import Base, get_db
from app.main import app
from app.config import settings

# Import all models to ensure they are registered with SQLAlchemy
from app.models import user, company, expense, approval_rule, approval_history, expense_line

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

    # Drop tables
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    
    # Mock email service to avoid SMTP connection errors in tests
    # Mock currency service to avoid external API calls
    async def mock_currency_convert(self, from_currency, to_currency, amount):
        """Mock currency conversion - returns the same amount (1:1)"""
        return float(amount)
    
    with patch('app.services.email_service.EmailService.send_email', new_callable=AsyncMock) as mock_send_email, \
         patch('app.services.currency_service.CurrencyService.convert', new=mock_currency_convert):
        mock_send_email.return_value = None
        with TestClient(app) as c:
            yield c