"""Auth helpers: password hashing, session tokens, role-based dependencies.

Roles
-----
- passenger : default for public sign-ups; can use feedback widget and book
- manager   : everything passenger + Voice-of-Customer dashboard
- admin     : everything manager + user management

Tokens are opaque session strings stored server-side in the ``sessions``
collection. The frontend sends ``Authorization: Bearer <token>``.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import Depends, Header, HTTPException
from passlib.context import CryptContext

import mongo_bridge

ROLES = ("passenger", "manager", "admin")
SESSION_TTL_DAYS = 7

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _users():
    return mongo_bridge._get_db()["Authorized_users"]


def _sessions():
    return mongo_bridge._get_db()["sessions"]


# ─────────────────────────────────────────────
# Passwords
# ─────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd.verify(plain, hashed)
    except Exception:
        return False


# ─────────────────────────────────────────────
# Sessions
# ─────────────────────────────────────────────

def create_session(user_id: str, role: str) -> str:
    token = secrets.token_urlsafe(32)
    _sessions().insert_one({
        "token":      token,
        "user_id":    str(user_id),
        "role":       role,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS),
    })
    return token


def revoke_session(token: str) -> None:
    _sessions().delete_one({"token": token})


def _find_session(token: str) -> Optional[dict]:
    s = _sessions().find_one({"token": token})
    if not s:
        return None
    if s.get("expires_at") and s["expires_at"] < datetime.utcnow():
        _sessions().delete_one({"_id": s["_id"]})
        return None
    return s


# ─────────────────────────────────────────────
# User helpers
# ─────────────────────────────────────────────

def public_user(doc: dict) -> dict:
    return {
        "id":    str(doc["_id"]),
        "name":  doc.get("name"),
        "email": doc.get("email"),
        "role":  doc.get("role", "passenger"),
        "active":bool(doc.get("active", True)),
    }


def find_user_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    return _users().find_one({"email": email.lower().strip()})


def find_user_by_id(uid: str) -> Optional[dict]:
    try:
        return _users().find_one({"_id": ObjectId(uid)})
    except Exception:
        return None


def ensure_default_admin(email: str = "admin@skyvoyage.app",
                        password: str = "Admin1234",
                        name: str = "Default Admin") -> None:
    """Seed one admin if the Authorized_users collection has no admin yet.
    Prints a one-line warning so the operator can change the password."""
    col = _users()
    if col.count_documents({"role": "admin"}) > 0:
        return
    col.insert_one({
        "name":          name,
        "email":         email.lower(),
        "password_hash": hash_password(password),
        "role":          "admin",
        "active":        True,
        "created_at":    datetime.utcnow(),
    })
    print(f"[auth] seeded default admin: {email} / {password}  "
          "*** change this password immediately ***")


# ─────────────────────────────────────────────
# FastAPI dependencies
# ─────────────────────────────────────────────

def _extract_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    session = _find_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = find_user_by_id(session["user_id"])
    if not user or not user.get("active", True):
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_roles(*allowed: str):
    def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _dep


require_manager = require_roles("manager", "admin")
require_admin   = require_roles("admin")
