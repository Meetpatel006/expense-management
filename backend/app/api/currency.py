from fastapi import APIRouter, Depends
from typing import List
from app.services.currency_service import CurrencyService

router = APIRouter(prefix="/api/currency", tags=["Currency"])

@router.get("/countries")
async def get_countries():
    """Get all countries with their currencies"""
    currency_service = CurrencyService()
    return await currency_service.get_countries()

@router.get("/convert")
async def convert_currency(
    from_currency: str,
    to_currency: str,
    amount: float
):
    """Convert currency amount"""
    currency_service = CurrencyService()
    return await currency_service.convert(from_currency, to_currency, amount)

@router.get("/rates/{base_currency}")
async def get_exchange_rates(base_currency: str):
    """Get all exchange rates for base currency"""
    currency_service = CurrencyService()
    return await currency_service.get_rates(base_currency)