# Authentication

from fastapi import Depends


def get_current_user_id() -> str:
    return "stub-user-001"