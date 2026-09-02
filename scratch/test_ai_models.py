import os
import sys
import time
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from app.ai.model_manager import hf_client

models = [
    "Qwen/Qwen2.5-72B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "Qwen/Qwen2.5-Coder-32B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3"
]

prompt = """Extract entities and relationships as JSON from this text snippet:
State vs Vinit Yadav on 15 July, 2026 IN THE COURT OF MS. VANDANA JAIN: ADDL. SESSIONS JUDGE-03/SPECIAL JUDGE (COMPANIES ACT), DWARKA COURTS, NEW DELHI. SC No. : 19/2022 State Vs. : Vinit Yadav FIR No. : 454/2021 PS : Dwarka South U/s : 307/34 IPC & 25/27 Arms Act. Accused Vinit Yadav S/o Late Sh. Ramesh Sharma R/o H.No. 12, Village Palam, New Delhi was driving vehicle Tata Nexon bearing registration number DL-10-CM-3681. Complainant Deepak Sharma S/o Sh. Anju Sharma was injured near Sector 12 Dwarka. Seized weapon pistol No. 11660 and motorcycle DL-1SAF-2050.

Return ONLY JSON format: {"entities": [{"name": "...", "type": "PERSON|LOCATION|VEHICLE|ORGANIZATION|WEAPON"}], "relationships": [{"source": "...", "target": "...", "type": "CONNECTED_TO"}]}"""

for m in models:
    t0 = time.time()
    print(f"Testing model: {m}...", flush=True)
    try:
        res = hf_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            model=m,
            max_tokens=1500,
            temperature=0.1
        )
        print(f"  [SUCCESS] {m} in {round(time.time()-t0, 2)}s:")
        print(res.choices[0].message.content[:500])
        break
    except Exception as e:
        print(f"  [FAILED] {m}: {e}")
