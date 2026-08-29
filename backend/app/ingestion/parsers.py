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
    import PyPDF2
    try:
        reader = PyPDF2.PdfReader(BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Failed to parse PDF: {e}")
        return "Failed to parse PDF content."

async def parse_docx(file_bytes: bytes) -> str:
    try:
        import docx
        doc = docx.Document(BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        print(f"Failed to parse DOCX: {e}")
        return "Failed to parse DOCX content."

async def parse_image(file_bytes: bytes) -> str:
    try:
        from PIL import Image
        import pytesseract
        image = Image.open(BytesIO(file_bytes))
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        print(f"Failed to parse Image: {e}")
        return "Failed to parse Image content. (OCR requires tesseract)"
