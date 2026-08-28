from datetime import datetime

async def log_audit_action(db, email: str, action: str, resource: str):
    """
    Inserts a record into the 'audit_logs' collection inside MongoDB.
    """
    try:
        await db["audit_logs"].insert_one({
            "email": email,
            "action": action,
            "resource": resource,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        print(f"Failed to write audit log: {e}")
