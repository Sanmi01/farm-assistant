import json
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from ..schemas import ChatMessage, ChatRole
from .db import get_dynamodb_resource
from ..config import get_settings


def _table():
    settings = get_settings()
    return get_dynamodb_resource().Table(settings.chat_table_name)


def _to_dynamo(data: dict) -> dict:
    return json.loads(json.dumps(data, default=str), parse_float=Decimal)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sort_key(created_at: datetime, message_id: str) -> str:
    return f"{created_at.isoformat()}#{message_id}"


def _to_message(item: dict) -> ChatMessage:
    return ChatMessage(
        id=item["message_id"],
        farm_id=item["farm_id"],
        user_id=item["user_id"],
        role=item["role"],
        content=item["content"],
        created_at=item["created_at"],
    )


def append_message(
    farm_id: str,
    user_id: str,
    role: ChatRole,
    content: str,
) -> ChatMessage:
    message_id = str(uuid4())
    created_at = _now()

    item = {
        "farm_id": farm_id,
        "sort_key": _sort_key(created_at, message_id),
        "message_id": message_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "created_at": created_at.isoformat(),
    }

    _table().put_item(Item=_to_dynamo(item))
    return _to_message(item)


def list_messages(farm_id: str, limit: int = 50) -> list[ChatMessage]:
    response = _table().query(
        KeyConditionExpression="farm_id = :fid",
        ExpressionAttributeValues={":fid": farm_id},
        ScanIndexForward=False,
        Limit=limit,
    )
    items = response.get("Items", [])
    items.reverse()
    return [_to_message(item) for item in items]


def delete_farm_messages(farm_id: str) -> int:
    response = _table().query(
        KeyConditionExpression="farm_id = :fid",
        ExpressionAttributeValues={":fid": farm_id},
    )
    items = response.get("Items", [])
    if not items:
        return 0

    with _table().batch_writer() as batch:
        for item in items:
            batch.delete_item(
                Key={"farm_id": item["farm_id"], "sort_key": item["sort_key"]}
            )
    return len(items)