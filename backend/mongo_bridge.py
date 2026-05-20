"""MongoDB connection bridge for the Face AI backend.

Provides _get_db(), used by main.py's verify-face route to read the
Authorized_users collection. Connection details can be overridden via
the MONGO_URI and MONGO_DB environment variables.
"""
import os

from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB = os.getenv("MONGO_DB", "tunisys")

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client


def _get_db():
    return _get_client()[MONGO_DB]
