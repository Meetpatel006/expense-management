import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.expense import Expense, ExpenseStatus, ExpenseCategory
from app.models.approval_rule import ApprovalRule, RuleApprover
from app.utils.security import get_password_hash

def test_create_approval_rule(client: TestClient, db: Session):
    """Test creating an approval rule"""
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

    manager = User(
        email="manager@test.com",
        password_hash=get_password_hash("ManagerPass123!"),
        name="Manager User",
        role=UserRole.MANAGER,
        company_id=company.id
    )
    db.add(manager)
    db.commit()
    db.refresh(admin)
    db.refresh(manager)

    # Get admin auth token
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@test.com",
            "password": "AdminPass123!"
        }
    )
    token = response.json()["access_token"]

    # Create approval rule
    response = client.post(
        "/api/approval-rules",
        json={
            "rule_name": "Test Rule",
            "description": "Test approval rule",
            "manager_id": str(manager.id),
            "is_manager_first_approver": True,
            "is_sequential": True,
            "approvers": [
                {
                    "approver_id": str(manager.id),
                    "sequence_order": 1,
                    "is_required": True
                }
            ]
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["rule_name"] == "Test Rule"

def test_get_approval_rules(client: TestClient, db: Session):
    """Test getting approval rules"""
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
    db.commit()

    # Get admin auth token
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@test.com",
            "password": "AdminPass123!"
        }
    )
    token = response.json()["access_token"]

    # Get approval rules
    response = client.get(
        "/api/approval-rules",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    # Should return empty list initially
    assert isinstance(data, list)

def test_approve_expense(client: TestClient, db: Session):
    """Test approving an expense"""
    # Create test data
    company = Company(
        name="Test Company",
        base_currency="USD",
        country="United States"
    )
    db.add(company)
    db.flush()

    employee = User(
        email="employee@test.com",
        password_hash=get_password_hash("EmployeePass123!"),
        name="Employee User",
        role=UserRole.EMPLOYEE,
        company_id=company.id
    )
    db.add(employee)

    manager = User(
        email="manager@test.com",
        password_hash=get_password_hash("ManagerPass123!"),
        name="Manager User",
        role=UserRole.MANAGER,
        company_id=company.id
    )
    db.add(manager)
    db.flush()

    # Create approval rule
    rule = ApprovalRule(
        company_id=company.id,
        rule_name="Test Rule",
        manager_id=manager.id,
        is_manager_first_approver=True,
        is_sequential=True
    )
    db.add(rule)
    db.flush()

    rule_approver = RuleApprover(
        approval_rule_id=rule.id,
        approver_id=manager.id,
        sequence_order=1,
        is_required=True
    )
    db.add(rule_approver)

    # Create expense
    expense = Expense(
        employee_id=employee.id,
        company_id=company.id,
        amount=100.00,
        currency="USD",
        amount_in_base_currency=100.00,
        category=ExpenseCategory.FOOD,
        description="Test expense",
        expense_date=datetime.now(),
        status=ExpenseStatus.PENDING_APPROVAL,
        approval_rule_id=rule.id,
        current_approver_id=manager.id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    # Get manager auth token
    response = client.post(
        "/api/auth/login",
        json={
            "email": "manager@test.com",
            "password": "ManagerPass123!"
        }
    )
    token = response.json()["access_token"]

    # Approve expense
    response = client.post(
        f"/api/expenses/{expense.id}/approve",
        json={"comments": "Approved"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200