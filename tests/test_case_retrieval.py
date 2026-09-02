import asyncio
import pymongo
import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from app.main import app
from app.api.routes.auth import create_access_token
from app.core.database import connect_to_mongo, close_mongo_connection

def get_auth_headers():
    token = create_access_token({"sub": "gulabjam@gmail.com"})
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_vinit_case_entity_retrieval():
    await connect_to_mongo()
    vinit_case_id = "6a971ef425f0b38746bbe8e7"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/entities/?case_id={vinit_case_id}", headers=get_auth_headers())
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0, "Entities count for Vinit case should be greater than 0"
    
    # Check key Vinit case entities
    names = [e["name"].lower() for e in data]
    assert any("vinit" in n for n in names), "Vinit Yadav should be in entities"
    assert any("deepak" in n for n in names), "Deepak Sharma should be in entities"

@pytest.mark.asyncio
async def test_vinit_case_network_retrieval():
    vinit_case_id = "6a971ef425f0b38746bbe8e7"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/network/{vinit_case_id}", headers=get_auth_headers())
    
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "links" in data
    assert len(data["nodes"]) > 0, "Nodes count for Vinit case 3D link map should be > 0"
    assert len(data["links"]) > 0, "Links count for Vinit case 3D link map should be > 0"

@pytest.mark.asyncio
async def test_nonexistent_case_isolation():
    fake_case_id = "000000000000000000000000"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_entities = await ac.get(f"/api/entities/?case_id={fake_case_id}", headers=get_auth_headers())
        res_network = await ac.get(f"/api/network/{fake_case_id}", headers=get_auth_headers())
    
    assert res_entities.status_code == 200
    assert len(res_entities.json()) == 0, "Non-existent case must return 0 entities"
    
    assert res_network.status_code == 200
    net_data = res_network.json()
    assert len(net_data["nodes"]) == 0, "Non-existent case network nodes must be empty"
    assert len(net_data["links"]) == 0, "Non-existent case network links must be empty"

@pytest.mark.asyncio
async def test_case_isolation_between_cases():
    case_a_id = "6a9608b1e37807cffb88efd0"
    case_b_id = "6a96093de37807cffb88efdf"
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_a = await ac.get(f"/api/entities/?case_id={case_a_id}", headers=get_auth_headers())
        res_b = await ac.get(f"/api/entities/?case_id={case_b_id}", headers=get_auth_headers())
        
    ents_a = res_a.json()
    ents_b = res_b.json()
    
    case_a_ids = {e["_id"] for e in ents_a}
    case_b_ids = {e["_id"] for e in ents_b}
    
    assert len(case_a_ids.intersection(case_b_ids)) == 0, "Case A and Case B entities must be strictly isolated"

async def run_all():
    await connect_to_mongo()
    await test_vinit_case_entity_retrieval()
    await test_vinit_case_network_retrieval()
    await test_nonexistent_case_isolation()
    await test_case_isolation_between_cases()
    await close_mongo_connection()
    print("ALL 4 RETRIEVAL AND ISOLATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_all())
