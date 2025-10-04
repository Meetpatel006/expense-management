import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.company import Company
from app.utils.security import get_password_hash

def test_signup(client: TestClient, db: Session):
    """Test user signup"""
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test Admin",
            "email": "admin@test.com",
            "password": "TestPass123!",
            "confirm_password": "TestPass123!",
            "country": "United States"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data

def test_login(client: TestClient, db: Session):
    """Test user login"""
    # First create a user
    company = Company(
        name="Test Company",
        base_currency="USD",
        country="United States"
    )
    db.add(company)
    db.flush()

    user = User(
        email="test@example.com",
        password_hash=get_password_hash("TestPass123!"),
        name="Test User",
        role=UserRole.EMPLOYEE,
        company_id=company.id
    )
    db.add(user)
    db.commit()

    # Test login
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPass123!"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client: TestClient):
    """Test login with invalid credentials"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401