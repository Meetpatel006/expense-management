import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.company import Company
from app.utils.security import get_password_hash

def test_create_user(client: TestClient, db: Session):
    """Test creating a new user"""
    # Create admin user and company first
    company = Company(
        name="Test Company",
        base_currency="USD",
        country="United States"
    )
    db.add(company)
    db.flush()

    admin = User(
        email="admin@test.com",
        password_hash=get_password_hash("AdminPass123!"),
        name="Admin User",
        role=UserRole.ADMIN,
        company_id=company.id
    )
    db.add(admin)
    db.commit()

    # Get auth token
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@test.com",
            "password": "AdminPass123!"
        }
    )
    token = response.json()["access_token"]

    # Create new user
    response = client.post(
        "/api/users",
        json={
            "email": "employee@test.com",
            "name": "Test Employee",
            "role": "employee"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "employee@test.com"
    assert data["name"] == "Test Employee"

def test_get_users(client: TestClient, db: Session):
    """Test getting users"""
    # Create test data
    company = Company(
        name="Test Company",
        base_currency="USD",
        country="United States"
    )
    db.add(company)
    db.flush()

    user = User(
        email="user@test.com",
        password_hash=get_password_hash("UserPass123!"),
        name="Test User",
        role=UserRole.EMPLOYEE,
        company_id=company.id
    )
    db.add(user)
    db.commit()

    # Get auth token
    response = client.post(
        "/api/auth/login",
        json={
            "email": "user@test.com",
            "password": "UserPass123!"
        }
    )
    token = response.json()["access_token"]

    # Get users
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

def test_update_user(client: TestClient, db: Session):
    """Test updating a user"""
    # Create test data
    company = Company(
        name="Test Company",
        base_currency="USD",
        country="United States"
    )
    db.add(company)
    db.flush()

    admin = User(
        email="admin@test.com",
        password_hash=get_password_hash("AdminPass123!"),
        name="Admin User",
        role=UserRole.ADMIN,
        company_id=company.id
    )
    db.add(admin)

    user = User(
        email="user@test.com",
        password_hash=get_password_hash("UserPass123!"),
        name="Test User",
        role=UserRole.EMPLOYEE,
        company_id=company.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Get admin auth token
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@test.com",
            "password": "AdminPass123!"
        }
    )
    token = response.json()["access_token"]

    # Update user
    response = client.patch(
        f"/api/users/{user.id}",
        json={"name": "Updated Name"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"