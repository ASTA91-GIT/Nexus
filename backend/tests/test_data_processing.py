import pytest
from app.services.data_processing.cleaners import clean_whitespace
from app.services.data_processing.normalizers import normalize_name, normalize_email, normalize_phone, normalize_date
from app.services.data_processing.validators import validate_entity
from app.services.data_processing.quality_analyzer import calculate_entity_quality

def test_clean_whitespace():
    assert clean_whitespace("   Rohan    Mehta   ") == "Rohan Mehta"
    assert clean_whitespace("NoExtraSpace") == "NoExtraSpace"

def test_normalize_name():
    assert normalize_name("rohan mehta") == "Rohan Mehta"
    assert normalize_name("FBI agent") == "FBI Agent"

def test_normalize_email():
    assert normalize_email(" Rohan.Mehta@EXAMPLE.com ") == "rohan.mehta@example.com"

def test_normalize_phone():
    assert normalize_phone("+91 90000 10001") == "+919000010001"
    assert normalize_phone("invalid phone") == ""

def test_normalize_date():
    date, ambig = normalize_date("2026-09-01")
    assert date == "2026-09-01"
    assert not ambig
    
    date, ambig = normalize_date("01/02/2026")
    assert ambig # Slashes indicate ambiguous format often

def test_validate_entity():
    valid = {"name": "Test", "type": "PERSON", "position": {"lat": 10, "lng": 20}}
    status, warn, err = validate_entity(valid)
    assert status == "VALID"
    
    invalid = {"type": "PERSON"}
    status, warn, err = validate_entity(invalid)
    assert status == "INVALID"
    
    warning = {"name": "Test", "type": "PERSON", "position": {}}
    status, warn, err = validate_entity(warning)
    assert status == "WARNING"

def test_calculate_entity_quality():
    entity = {"name": "Rohan", "type": "PERSON", "description": "Desc", "properties": {"email": "test@test.com"}}
    q = calculate_entity_quality(entity, "VALID", False)
    assert q["overall_score"] > 80
