"""Omniken Supabase/Prisma integration client.
Provides user auth, license management, and usage tracking.
"""

import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nhkscsynarfbwgfcrgva.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@db.ppbepczquphfpmxfelyk.supabase.co:5432/postgres")

try:
    from supabase import create_client, Client
    client: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
except ImportError:
    client = None

try:
    from prisma import Prisma
    prisma = Prisma()
except ImportError:
    prisma = None


def get_client():
    return client


async def init_db():
    if prisma:
        await prisma.connect()


async def close_db():
    if prisma:
        await prisma.disconnect()


def generate_license_key(tier: str) -> str:
    prefix = "OMN" if tier == "founder" else "OMN-E"
    salt = secrets.token_hex(8)
    raw = f"{prefix}-{tier}-{salt}-{secrets.randbelow(10**6):06d}"
    return raw.upper()


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def register_user(email: str, name: Optional[str] = None) -> Optional[dict]:
    if not client:
        return {"error": "Supabase not configured", "email": email}

    try:
        result = client.table("users").insert({
            "email": email,
            "name": name or email.split("@")[0],
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        return {"error": str(e)}


def create_license(user_id: str, tier: str, price: int) -> Optional[dict]:
    if not client:
        license_key = generate_license_key(tier)
        return {"license_key": license_key, "tier": tier, "status": "active"}

    try:
        license_key = generate_license_key(tier)
        result = client.table("licenses").insert({
            "user_id": user_id,
            "tier": tier,
            "price": price,
            "license_key": license_key,
            "status": "active",
            "activated_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
        }).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        return {"error": str(e)}


def log_usage(user_id: str, prompt_in: int, prompt_out: int, model: str = "gpt4o",
              input_type: str = "text", context_cache: bool = False,
              cache_hits: int = 0) -> Optional[dict]:
    if not client:
        return {"logged": True}

    try:
        saved = max(0, prompt_in - prompt_out)
        reduction = (saved / prompt_in * 100) if prompt_in > 0 else 0
        payload = {
            "user_id": user_id,
            "prompt_in": prompt_in,
            "prompt_out": prompt_out,
            "saved": saved,
            "reduction": round(reduction, 1),
            "model": model,
            "input_type": input_type,
            "context_cache": context_cache,
            "cache_hits": cache_hits,
        }
        result = client.table("usage_logs").insert(payload).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        return {"error": str(e)}


def get_user_usage(user_id: str) -> dict:
    if not client:
        return {"total_tokens_saved": 0, "total_prompts": 0}

    try:
        result = client.table("usage_logs") \
            .select("saved", count="exact") \
            .eq("user_id", user_id) \
            .execute()
        total_saved = sum(row.get("saved", 0) for row in (result.data or []))
        return {
            "total_tokens_saved": total_saved,
            "total_prompts": len(result.data or []),
        }
    except Exception:
        return {"total_tokens_saved": 0, "total_prompts": 0}


def create_checkout_session(email: str, tier: str) -> Optional[dict]:
    if not client:
        return {"checkout_url": f"https://omniken.dev/checkout/{tier}", "session_id": "sandbox"}

    try:
        prices = {"founder": 89, "elite": 179}
        session = client.table("checkout_sessions").insert({
            "email": email,
            "tier": tier,
            "amount": prices.get(tier, 89),
            "status": "pending",
        }).execute()
        return session.data[0] if session.data else None
    except Exception as e:
        return {"error": str(e)}
