import pandas as pd
from typing import List, Dict, Any
from io import BytesIO

async def parse_csv(file_bytes: bytes) -> List[Dict[str, Any]]:
    df = pd.read_csv(BytesIO(file_bytes))
    return df.to_dict(orient="records")

async def parse_json(file_bytes: bytes) -> List[Dict[str, Any]]:
    df = pd.read_json(BytesIO(file_bytes))
    return df.to_dict(orient="records")

async def parse_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")

async def parse_pdf(file_bytes: bytes) -> str:
    # Requires a library like PyMuPDF or pdfplumber
    # For now, returning a not-implemented message to satisfy NO FAKE FUNCTIONALITY rule
    return "PDF parsing requires additional dependencies (e.g., PyMuPDF). Not configured."
