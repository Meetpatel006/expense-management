import httpx
from fastapi import HTTPException
from typing import Dict, Optional
from app.config import settings

class CurrencyService:
    def __init__(self):
        self.countries_api_url = settings.COUNTRIES_API_URL
        self.currency_api_url = settings.CURRENCY_API_BASE_URL

    async def get_countries(self):
        """Get all countries with their currencies"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.countries_api_url)
                response.raise_for_status()
                countries_data = response.json()

                countries = []
                for country in countries_data:
                    if 'currencies' in country and country['currencies']:
                        currency_code = list(country['currencies'].keys())[0]
                        currency_info = country['currencies'][currency_code]
                        countries.append({
                            'name': country.get('name', {}).get('common', ''),
                            'code': country.get('cca2', ''),
                            'currency': currency_code,
                            'currency_name': currency_info.get('name', ''),
                            'currency_symbol': currency_info.get('symbol', '')
                        })

                return countries
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch countries data: {str(e)}"
                )

    async def get_country_currency(self, country_name: str) -> Optional[Dict]:
        """Get currency for specific country"""
        countries = await self.get_countries()
        for country in countries:
            if country['name'].lower() == country_name.lower():
                return country
        return None

    async def get_rates(self, base_currency: str):
        """Get exchange rates for base currency"""
        url = f"{self.currency_api_url}{base_currency}"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

                if 'rates' not in data:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid currency code"
                    )

                return {
                    'base': base_currency,
                    'rates': data['rates'],
                    'timestamp': data.get('timestamp')
                }
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid currency code"
                    )
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch exchange rates: {str(e)}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch exchange rates: {str(e)}"
                )

    async def convert(self, from_currency: str, to_currency: str, amount: float):
        """Convert currency amount"""
        rates_data = await self.get_rates(from_currency)
        rates = rates_data['rates']

        if to_currency not in rates:
            raise HTTPException(
                status_code=400,
                detail=f"Currency {to_currency} not supported"
            )

        converted_amount = amount * rates[to_currency]
        return round(converted_amount, 2)