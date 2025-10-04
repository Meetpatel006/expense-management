from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.company import Company

router = APIRouter(prefix="/api/company", tags=["Company"])

@router.get("")
async def get_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's company info"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    return company

@router.patch("/currency")
async def update_base_currency(
    base_currency: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update company base currency (Admin only)"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    company.base_currency = base_currency
    db.commit()
    db.refresh(company)
    return company