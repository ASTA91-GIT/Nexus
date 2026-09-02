import asyncio
import os
import time
from fastapi.testclient import TestClient
from app.main import app

# Test dataset definitions across diverse investigation file types
TEST_DATASETS = [
    {
        "category": "A. FIR / Police Report",
        "filename": "test_fir_report.txt",
        "text": """
        FIRST INFORMATION REPORT (FIR No. 204/2026)
        Police Station: Crime Branch Sector 5
        Complainant: Inspector Vikram Singh
        Accused: Suresh Kumar, resident of Andheri East.
        Incident Summary: On 12th August, Suresh Kumar contacted Ramesh Shah at Bandra Kurla Complex.
        Suresh Kumar was observed meeting Ramesh Shah near ICICI Bank Branch.
        Investigating Officer: Inspector Vikram Singh.
        Page 1 of 4. Confidential Document. Serial No: 88492.
        """
    },
    {
        "category": "B. Call Log / Telecom Record",
        "filename": "test_call_log.txt",
        "text": """
        CALL DETAIL RECORD (CDR) SUMMARY
        Subscriber: Anish Kapoor (Phone: +919820011223)
        Target Contact: Priya Sharma (Phone: +919892233445)
        Call Duration: 420 seconds.
        Call Type: Outgoing Voice Intercept.
        Location Cell Tower: Dadar West Tower 4.
        Anish Kapoor phoned Priya Sharma at 14:30 hrs.
        Table 2: Call Frequency Log. Status Code: 200 OK.
        """
    },
    {
        "category": "C. Financial / Bank Transaction Record",
        "filename": "test_bank_statement.txt",
        "text": """
        BANK TRANSACTION STATEMENT - HDFC BANK
        Account Holder: Mehta Enterprises
        Account Number: Account 5010023499182
        Recipient: Global Logistics Corp
        Recipient Account: Account 99182300412
        Transaction Amount: INR 500,000.
        Mehta Enterprises transferred money to Global Logistics Corp.
        Mehta Enterprises holds account at HDFC Bank.
        Subtotal: 500000. Row 15. Item #492.
        """
    },
    {
        "category": "D. Location / GPS Evidence",
        "filename": "test_gps_log.txt",
        "text": """
        GPS INTERCEPT TRACKING REPORT
        Target Vehicle: MH-02-CL-4920
        Driver: Deepak Verma
        Destination: Navi Mumbai
        Waypoint: Deepak Verma arrived at Navi Mumbai near APMC Market.
        Deepak Verma lives in Pune.
        System ID: 0x9f3a12. GPS Status: LOCKED.
        """
    },
    {
        "category": "E. Chat / SMS Evidence",
        "filename": "test_sms_chat.txt",
        "text": """
        ENCRYPTED MESSAGING INTERCEPT
        Sender: Neha Gupta (Email: neha.gupta@securemail.com)
        Receiver: Rajesh Nair (Email: rajesh.nair@investcorp.org)
        Message Text: "Meeting at Taj Hotel tomorrow. Call me on 9123456789."
        Neha Gupta emailed Rajesh Nair.
        Neha Gupta uses phone number 9123456789.
        Vk Wn C19 F37b1z === --- ???
        """
    },
    {
        "category": "F. OCR-like / Noisy Document",
        "filename": "test_noisy_ocr.txt",
        "text": """
        CONFIDENTIAL FORENSIC SCAN (Page 3 of 12)
        ========================================
        Header: CASE FILE #9910-B
        Suspect: Vijay Malhotra.
        Address: Vijay Malhotra resides in Connaught Place.
        Associates: Vijay Malhotra contacted Sunita Rao.
        Noise Lines: Vk Wn C19 F37b1z Table 4 Row 12 [12] *** ---
        Status: PENDING_REVIEW.
        """
    }
]

def run_quality_suite():
    with TestClient(app) as client:
        print("=================================================================")
        print("      NEXUS GENERAL ENTITY QUALITY & EXTRACTION SUITE            ")
        print("=================================================================\n")

        # 1. Register & Login
        user_data = {
            "email": "quality_auditor@nexus.gov",
            "password": "Password123!",
            "full_name": "Quality Auditor",
            "department": "AI Quality Assurance"
        }
        client.post("/api/auth/register", json=user_data)
        login_res = client.post("/api/auth/login", data={"username": user_data["email"], "password": user_data["password"]})
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Quality Test Case
        case_res = client.post("/api/cases/", json={
            "name": "GENERAL_ENTITY_QUALITY_TEST_CASE",
            "description": "Multi-document pipeline quality test case",
            "priority": "HIGH"
        }, headers=headers)
        assert case_res.status_code == 200
        case_id = case_res.json()["_id"]

        print(f"Created Isolated Case ID: {case_id}\n")

        # 3. Test Each Document Sample
        for sample in TEST_DATASETS:
            print("-----------------------------------------------------------------")
            print(f"TEST SAMPLE: {sample['category']}")
            print("-----------------------------------------------------------------")

            # Create temp file on disk
            filepath = os.path.join(os.path.dirname(__file__), sample["filename"])
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(sample["text"])

            # Upload evidence
            with open(filepath, "rb") as f:
                res = client.post(
                    "/api/evidence/upload",
                    data={"case_id": case_id, "title": sample["filename"]},
                    files={"file": (sample["filename"], f, "text/plain")},
                    headers=headers
                )
            assert res.status_code == 200, f"Upload failed for {sample['filename']}: {res.text}"
            ev_id = res.json()["_id"]

            if os.path.exists(filepath):
                os.remove(filepath)

            # Wait briefly for background pipeline task
            time.sleep(2)

        # 4. Fetch Network API & Verify Persisted Results
        print("\n=================================================================")
        print("               FINAL PIPELINE METRICS & NETWORK API              ")
        print("=================================================================\n")

        net_res = client.get(f"/api/network/{case_id}", headers=headers)
        assert net_res.status_code == 200
        graph_data = net_res.json()

        nodes = graph_data.get("nodes", [])
        links = graph_data.get("links", [])

        print(f"Total Persisted Network Nodes: {len(nodes)}")
        print(f"Total Persisted Network Links: {len(links)}\n")

        print("PERSISTED VALID ENTITIES (Sample):")
        for n in nodes:
            print(f"  [NODE] Name: '{n.get('name')}', Type: {n.get('type')}, Risk: {n.get('risk_score')}")

        print("\nPERSISTED VALID RELATIONSHIPS (Sample):")
        for l in links:
            src_node = next((n["name"] for n in nodes if n["id"] == l["source"]), l["source"])
            tgt_node = next((n["name"] for n in nodes if n["id"] == l["target"]), l["target"])
            print(f"  [LINK] {src_node} --[{l.get('type')}]--> {tgt_node}")

        assert len(nodes) > 0, "ERROR: No valid nodes were created!"
        assert len(links) > 0, "ERROR: No valid relationships were created!"

        # Verify no garbage OCR noise tokens were persisted as nodes
        bad_tokens = {"vk", "wn", "c19", "f37b1z", "page 1 of 4", "table 2", "status code", "subtotal", "0x9f3a12"}
        persisted_names = {n.get("name", "").lower() for n in nodes}

        found_bad = bad_tokens.intersection(persisted_names)
        print(f"\nGarbage Tokens Check in MongoDB: {len(found_bad)} bad tokens found.")
        assert len(found_bad) == 0, f"REGRESSION ERROR: Garbage tokens persisted in DB: {found_bad}"

        print("\nSUCCESS: All quality pipeline tests passed cleanly!")

if __name__ == "__main__":
    run_quality_suite()
