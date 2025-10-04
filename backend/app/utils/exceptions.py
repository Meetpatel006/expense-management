# Custom exceptions for the application

from fastapi import HTTPException

class ExpenseManagementException(HTTPException):
    """Base exception for expense management application"""
    pass

class ValidationError(ExpenseManagementException):
    """Validation error"""
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)

class NotFoundError(ExpenseManagementException):
    """Resource not found"""
    def __init__(self, resource: str):
        super().__init__(status_code=404, detail=f"{resource} not found")

class PermissionDeniedError(ExpenseManagementException):
    """Permission denied"""
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=403, detail=detail)

class AuthenticationError(ExpenseManagementException):
    """Authentication error"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)