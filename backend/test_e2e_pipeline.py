import asyncio
from fastapi.testclient import TestClient
from app.main import app

def main():
    with TestClient(app) as client:
        
        print("1. Registering test user...")
        res = client.post("/api/auth/register", json={
            "email": "testagent2@nexus.gov",
            "password": "Password123!",
            "full_name": "Test Agent 2",
            "department": "AI Testing"
        })
        
        if res.status_code not in (200, 400):
            print("Register failed:", res.text)
            return

        print("2. Logging in...")
        res = client.post("/api/auth/login", data={
            "username": "testagent2@nexus.gov",
            "password": "Password123!"
        })
        if res.status_code != 200:
            print("Login failed:", res.text)
            return
        
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        print("3. Creating a new Case...")
        res = client.post("/api/cases/", json={
            "name": "TEST_PIPELINE_CASE_2",
            "description": "E2E verification of graph pipeline",
            "priority": "HIGH"
        }, headers=headers)
        
        if res.status_code != 200:
            print("Case creation failed:", res.text)
            return
            
        case_id = res.json()["_id"]
        print(f"   Created Case ID: {case_id}")
        
        print("4. Uploading evidence file...")
        import os
        evidence_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "test_evidence.txt")
        with open(evidence_path, "rb") as f:
            # httpx TestClient requires files as a dictionary
            files = {"file": ("test_evidence.txt", f, "text/plain")}
            data = {"case_id": case_id}
            res = client.post("/api/ingestion/upload", data=data, files=files, headers=headers)
            
        if res.status_code != 200:
            print("Upload failed:", res.text)
            return
            
        upload_result = res.json()
        print("   Upload Success!")
        print("   Message:", upload_result.get("message"))
        print("   Entities Created:", upload_result.get("entities_created"))
        print("   Relationships Created:", upload_result.get("relationships_created"))
        
        print("5. Verifying Graph API Data...")
        res = client.get(f"/api/network/{case_id}", headers=headers)
        if res.status_code != 200:
            print("Graph API failed:", res.text)
            return
            
        graph_data = res.json()
        nodes = graph_data.get("nodes", [])
        links = graph_data.get("links", [])
        
        print(f"\n--- FINAL REPORT METRICS ---")
        print(f"Graph API Nodes Count: {len(nodes)}")
        print(f"Graph API Edges Count: {len(links)}")
        
        if len(nodes) > 0:
            print("\nExtracted Node Types:")
            types = {}
            for n in nodes:
                t = n.get("type", "UNKNOWN")
                types[t] = types.get(t, 0) + 1
            for t, count in types.items():
                print(f" - {t}: {count}")
                
            print("\nExtracted Relationships (sample):")
            for l in links[:5]:
                # find names
                src_name = next((n["name"] for n in nodes if n["id"] == l["source"]), l["source"])
                tgt_name = next((n["name"] for n in nodes if n["id"] == l["target"]), l["target"])
                print(f" - {src_name} --[{l.get('type')}]--> {tgt_name}")
        else:
            print("WARNING: No nodes extracted!")

if __name__ == "__main__":
    main()
