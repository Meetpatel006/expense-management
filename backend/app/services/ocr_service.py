from fastapi import UploadFile, HTTPException
import pytesseract
from PIL import Image
import io
import re
from datetime import datetime
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self, db):
        self.db = db

    async def process_receipt(self, file: UploadFile) -> Dict:
        """Process receipt image and extract data"""
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image"
            )

        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # Extract text using OCR
        try:
            text = pytesseract.image_to_string(image)
        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to process image"
            )

        # Parse receipt data
        parsed_data = self._parse_receipt_text(text)

        return {
            "extracted_text": text,
            "parsed_data": parsed_data
        }

    def _parse_receipt_text(self, text: str) -> Dict:
        """Parse receipt text to extract structured data"""
        lines = text.split('\n')
        parsed_data = {
            "merchant_name": "",
            "date": "",
            "total_amount": 0.0,
            "items": [],
            "tax_amount": 0.0
        }

        # Extract merchant name (usually first non-empty line)
        for line in lines:
            line = line.strip()
            if line and not line.replace('.', '').replace('-', '').isdigit():
                parsed_data["merchant_name"] = line
                break

        # Extract date
        parsed_data["date"] = self._parse_date(text)

        # Extract amounts and items
        amount_pattern = r'\$?(\d+\.?\d*)'
        item_lines = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Look for amounts
            amounts = re.findall(amount_pattern, line)
            if amounts:
                # Convert to float
                amounts_float = [float(amount) for amount in amounts]

                # Check if this looks like an item line
                if len(line.split()) > 1 and not any(word in line.lower() for word in ['total', 'tax', 'subtotal', 'change']):
                    # This might be an item
                    item_text = re.sub(amount_pattern, '', line).strip()
                    if item_text:
                        parsed_data["items"].append({
                            "description": item_text,
                            "amount": amounts_float[-1]  # Use last amount found
                        })
                else:
                    # Check for total
                    if 'total' in line.lower():
                        parsed_data["total_amount"] = amounts_float[-1]
                    elif 'tax' in line.lower():
                        parsed_data["tax_amount"] = amounts_float[-1]

        # If no total found, use the largest amount
        if parsed_data["total_amount"] == 0.0 and parsed_data["items"]:
            parsed_data["total_amount"] = sum(item["amount"] for item in parsed_data["items"])

        return parsed_data

    def _parse_date(self, text: str) -> str:
        """Parse date string to ISO format"""
        # Common date patterns
        date_patterns = [
            r'(\d{1,2})/(\d{1,2})/(\d{2,4})',  # MM/DD/YYYY or MM/DD/YY
            r'(\d{1,2})-(\d{1,2})-(\d{2,4})',  # MM-DD-YYYY or MM-DD-YY
            r'(\d{4})-(\d{1,2})-(\d{1,2})',    # YYYY-MM-DD
            r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', # MM.DD.YYYY or MM.DD.YY
        ]

        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            if matches:
                for match in matches:
                    try:
                        if len(match) == 3:
                            month, day, year = map(int, match)
                            if year < 100:
                                year += 2000
                            if 1 <= month <= 12 and 1 <= day <= 31:
                                return f"{year:04d}-{month:02d}-{day:02d}"
                    except ValueError:
                        continue

        # If no date found, return current date
        return datetime.now().strftime('%Y-%m-%d')