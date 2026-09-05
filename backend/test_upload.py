import time
import requests
import json

base_url = "http://localhost:8000"

# 1. Login to get token
login_data = {"username": "agent@nexus.gov", "password": "Password123!"}
print("Logging in...")
try:
    r_login = requests.post(f"{base_url}/api/auth/login", data=login_data)
    if r_login.status_code == 200:
        token = r_login.json().get("access_token")
        print("Login successful")
    else:
        print(f"Login failed: {r_login.text}")
        
        # Register instead
        reg_data = {
            "email": "testagent2@nexus.gov",
            "password": "Password123!",
            "full_name": "Test Agent",
            "department": "Cyber",
            "badge_number": "123",
            "designation": "Investigator"
        }
        r_reg = requests.post(f"{base_url}/api/auth/register", json=reg_data)
        r_login = requests.post(f"{base_url}/api/auth/login", data={"username": "testagent2@nexus.gov", "password": "Password123!"})
        token = r_login.json().get("access_token")
        print("Registered and logged in")
except Exception as e:
    print(f"Error during login: {e}")

headers = {"Authorization": f"Bearer {token}"}

# 2. Create a case
case_data = {
    "name": "Test Case Upload Speed",
    "description": "Testing upload speed",
    "case_type": "CYBER",
    "priority": "HIGH"
}
r_case = requests.post(f"{base_url}/api/cases/", json=case_data, headers=headers)
case_id = r_case.json().get("_id")
print(f"Created Case: {case_id}")

# 3. Upload a file and measure time
files = {'file': ('test.txt', 'This is a test evidence file containing Vinit Yadav and his vehicle Tata Nexon involved in an incident.', 'text/plain')}
data = {'case_id': case_id, 'title': 'Test Evidence'}

print("Starting Upload...")
start_time = time.time()
r_upload = requests.post(f"{base_url}/api/evidence/upload", files=files, data=data, headers=headers)
upload_time = time.time() - start_time
print(f"Upload Response Time: {upload_time:.4f} seconds")

evidence_id = r_upload.json().get("_id")
print(f"Upload Status: {r_upload.json().get('processing_status')}")

# 4. Wait for processing to complete
print("Waiting for background processing...")
processing_time_start = time.time()
while True:
    r_ev = requests.get(f"{base_url}/api/evidence/{evidence_id}", headers=headers)
    ev_status = r_ev.json().get('processing_status')
    if ev_status == "COMPLETED" or ev_status == "FAILED":
        break
    time.sleep(1)

total_processing_time = time.time() - processing_time_start
print(f"Final Status: {ev_status}")
print(f"Total Background Processing Time: {total_processing_time:.4f} seconds")

# 5. Check entities and relationships
r_cases = requests.get(f"{base_url}/api/entities/?case_id={case_id}", headers=headers)
print(f"Entities Found: {len(r_cases.json())}")

r_rels = requests.get(f"{base_url}/api/relationships/?case_id={case_id}", headers=headers)
print(f"Relationships Found: {len(r_rels.json())}")

print(f"TEST COMPLETE.")
