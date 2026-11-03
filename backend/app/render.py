"""Logika domain render Google Flow: token device, antrian, lease, kuota, dan hasil render (spec §4.2-4.3)."""

import hashlib


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
