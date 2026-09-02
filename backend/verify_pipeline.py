import asyncio
import os
import time
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_database, connect_to_mongo, close_mongo_connection
from bson import ObjectId

def run_test():
    with TestClient(app) as client:
        print("--- STARTING PIPELINE VERIFICATION ---")
        
        # 1. Register / Login
        user_data = {
            "email": "pipeline_verifier@nexus.gov",
            "password": "Password123!",
            "full_name": "Pipeline Verifier",
            "department": "Forensics"
        }
        client.post("/api/auth/register", json=user_data)
        
        login_res = client.post("/api/auth/login", data={"username": user_data["email"], "password": user_data["password"]})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[AUTH] Logged in successfully.")

        # 2. Create Case
        case_res = client.post("/api/cases/", json={
            "name": "TEST_PIPELINE_VERIFICATION",
            "description": "Case for end-to-end pipeline test",
            "priority": "HIGH"
        }, headers=headers)
        assert case_res.status_code == 200, f"Case creation failed: {case_res.text}"
        case_id = case_res.json()["_id"]
        print(f"[CASE] Created Case ID: {case_id}")

        # 3. Upload Evidence File
        sample_text = (
            "Rahul Sharma lives in Mumbai. "
            "Rahul Sharma uses phone number 9876543210. "
            "Rahul Sharma contacted Amit Patil. "
            "Amit Patil owns a bank account at XYZ Bank."
        )
        test_file_path = os.path.join(os.path.dirname(__file__), "scratch_test_evidence.txt")
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write(sample_text)

        with open(test_file_path, "rb") as f:
            upload_res = client.post(
                "/api/evidence/upload",
                data={"case_id": case_id, "title": "scratch_test_evidence.txt"},
                files={"file": ("scratch_test_evidence.txt", f, "text/plain")},
                headers=headers
            )
        assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
        evidence_id = upload_res.json()["_id"]
        print(f"[EVIDENCE] Uploaded Evidence ID: {evidence_id}")

        # Clean up temporary test file on disk
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

        # 4. Wait for background task processing
        print("[WAIT] Waiting 3 seconds for background task processing...")
        time.sleep(3)

        # 5. Verify Network API
        network_res = client.get(f"/api/network/{case_id}", headers=headers)
        assert network_res.status_code == 200, f"Network API failed: {network_res.text}"
        graph_data = network_res.json()

        nodes = graph_data.get("nodes", [])
        links = graph_data.get("links", [])

        print(f"\n--- VERIFICATION RESULTS ---")
        print(f"Nodes Count: {len(nodes)}")
        print(f"Links Count: {len(links)}")

        print("\nNodes Detail:")
        for n in nodes:
            print(f"  - ID: {n.get('id')}, Name: {n.get('name')}, Type: {n.get('type')}, Risk: {n.get('risk_score')}")

        print("\nLinks Detail:")
        for l in links:
            print(f"  - Source: {l.get('source')} -> Target: {l.get('target')} [Type: {l.get('type')}]")

        assert len(nodes) > 0, "ERROR: Nodes count is 0!"
        assert len(links) > 0, "ERROR: Links count is 0!"
        print("\nSUCCESS: Complete Evidence -> Extraction -> MongoDB -> Graph API pipeline verified!")

if __name__ == "__main__":
    run_test()
