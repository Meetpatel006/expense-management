import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.expense import Expense, ExpenseStatus, ExpenseCategory
from app.utils.security import get_password_hash

def test_create_expense(client: TestClient, db: Session):
    """Test creating an expense"""
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

    # Create expense
    response = client.post(
        "/api/expenses",
        json={
            "amount": 100.00,
            "currency": "USD",
            "category": "Food",
            "description": "Lunch meeting",
            "expense_date": datetime.now().isoformat(),
            "paid_by": "Cash"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 100.00
    assert data["currency"] == "USD"
    assert data["status"] == "draft"

def test_get_my_expenses(client: TestClient, db: Session):
    """Test getting user's expenses"""
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
    db.flush()

    expense = Expense(
        employee_id=user.id,
        company_id=company.id,
        amount=50.00,
        currency="USD",
        amount_in_base_currency=50.00,
        category=ExpenseCategory.FOOD,
        description="Test expense",
        expense_date=datetime.now(),
        status=ExpenseStatus.DRAFT
    )
    db.add(expense)
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

    # Get expenses
    response = client.get(
        "/api/expenses/my-expenses",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

def test_submit_expense(client: TestClient, db: Session):
    """Test submitting an expense for approval"""
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
    db.flush()

    expense = Expense(
        employee_id=user.id,
        company_id=company.id,
        amount=50.00,
        currency="USD",
        amount_in_base_currency=50.00,
        category=ExpenseCategory.FOOD,
        description="Test expense",
        expense_date=datetime.now(),
        status=ExpenseStatus.DRAFT
    )
    db.add(expense)
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

    # Submit expense
    response = client.post(
        f"/api/expenses/{expense.id}/submit",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200