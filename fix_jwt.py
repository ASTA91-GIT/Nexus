import json
import re

file_path = 'backend/app/core/security.py'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find SECRET_KEY usage
    new_secret_logic = '''import os
import warnings

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production" and SECRET_KEY == "supersecretkey":
    raise RuntimeError("Insecure JWT SECRET_KEY in production! Set SECRET_KEY in environment variables.")'''

    if 'SECRET_KEY = "supersecretkey"' in content:
        content = content.replace('SECRET_KEY = "supersecretkey"', new_secret_logic)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated JWT security in security.py')
    else:
        print('Could not find exact SECRET_KEY string in security.py')
except Exception as e:
    print('Failed:', e)
