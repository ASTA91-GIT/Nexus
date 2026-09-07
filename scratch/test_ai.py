import sys
import os
import time
import requests

base_url = "http://localhost:8000"

def test_file(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return

    file_name = os.path.basename(file_path)
    
    # 1. Login
    login_data = {"username": "agent@nexus.gov", "password": "Password123!"}
    try:
        r_login = requests.post(f"{base_url}/api/auth/login", data=login_data)
        if r_login.status_code == 200:
            token = r_login.json().get("access_token")
        else:
            # Register instead
            reg_data = {
                "email": "agent@nexus.gov",
                "password": "Password123!",
                "full_name": "Test Agent",
                "department": "Cyber"
            }
            requests.post(f"{base_url}/api/auth/register", json=reg_data)
            r_login = requests.post(f"{base_url}/api/auth/login", data=login_data)
            token = r_login.json().get("access_token")
    except Exception as e:
        print(f"Auth error: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a case
    case_data = {
        "name": f"AI Test - {file_name}",
        "description": "Testing AI extraction on a custom file",
        "priority": "MEDIUM"
    }
    r_case = requests.post(f"{base_url}/api/cases/", json=case_data, headers=headers)
    case_id = r_case.json().get("_id")
    print(f"Created Case: {case_id}")

    # 3. Upload file
    with open(file_path, "rb") as f:
        # Determine mime type naively
        mime = "text/plain"
        if file_name.endswith(".docx"):
            mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif file_name.endswith(".pdf"):
            mime = "application/pdf"
            
        files = {'file': (file_name, f, mime)}
        data = {'case_id': case_id, 'title': f'Evidence: {file_name}'}
        
        print(f"Uploading {file_name}...")
        r_upload = requests.post(f"{base_url}/api/evidence/upload", files=files, data=data, headers=headers)
        
        if r_upload.status_code != 200:
            print(f"Upload failed: {r_upload.text}")
            return
            
        evidence_id = r_upload.json().get("_id")

    # 4. Wait for processing
    print("Waiting for AI processing...")
    while True:
        r_ev = requests.get(f"{base_url}/api/evidence/{evidence_id}", headers=headers)
        ev_status = r_ev.json().get('processing_status')
        if ev_status in ["COMPLETED", "FAILED"]:
            break
        time.sleep(2)
        print(".", end="", flush=True)
    print(f"\nProcessing Status: {ev_status}")

    if ev_status == "COMPLETED":
        # 5. Fetch extracted nodes
        net_res = requests.get(f"{base_url}/api/network/{case_id}", headers=headers)
        net_data = net_res.json()
        nodes = net_data.get("nodes", [])
        links = net_data.get("links", [])
        
        print("\n--- AI EXTRACTION RESULTS ---")
        print(f"Extracted Entities ({len(nodes)}):")
        for n in nodes:
            print(f"  - [{n.get('type')}] {n.get('name')}")
            
        print(f"\nExtracted Relationships ({len(links)}):")
        for l in links:
            source = l.get('source')
            target = l.get('target')
            print(f"  - {source} --[{l.get('type')}]--> {target}")
            
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_ai.py <path_to_file>")
    else:
        test_file(sys.argv[1])
