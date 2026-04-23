import json
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from ..errors import NotFoundError
from ..schemas import (
    CreateFarmRequest,
    Farm,
    Recommendations,
    WeatherAnalysis,
)
from .db import get_farms_table


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_dynamo(data: dict) -> dict:
    return json.loads(json.dumps(data, default=str), parse_float=Decimal)


def _to_farm(item: dict) -> Farm:
    return Farm(
        id=item["farm_id"],
        user_id=item["user_id"],
        name=item["name"],
        location=item["location"],
        land_size=item["land_size"],
        budget=item["budget"],
        weather_analysis=item.get("weather_analysis") or WeatherAnalysis().model_dump(),
        recommendations=item.get("recommendations") or Recommendations().model_dump(),
        created_at=item["created_at"],
        updated_at=item["updated_at"],
    )


def create_farm(user_id: str, request: CreateFarmRequest) -> Farm:
    farm_id = str(uuid4())
    now = _now_iso()

    item = {
        "user_id": user_id,
        "farm_id": farm_id,
        "name": request.name,
        "location": request.location.model_dump(),
        "land_size": request.land_size.model_dump(),
        "budget": request.budget.model_dump(),
        "weather_analysis": WeatherAnalysis().model_dump(),
        "recommendations": Recommendations().model_dump(),
        "created_at": now,
        "updated_at": now,
    }

    get_farms_table().put_item(Item=_to_dynamo(item))
    return _to_farm(item)


def list_farms(user_id: str) -> list[Farm]:
    response = get_farms_table().query(
        KeyConditionExpression="user_id = :uid",
        ExpressionAttributeValues={":uid": user_id},
    )
    return [_to_farm(item) for item in response.get("Items", [])]


def get_farm(user_id: str, farm_id: str) -> Farm:
    response = get_farms_table().get_item(
        Key={"user_id": user_id, "farm_id": farm_id}
    )
    item = response.get("Item")
    if not item:
        raise NotFoundError(f"Farm {farm_id} not found")
    return _to_farm(item)


def delete_farm(user_id: str, farm_id: str) -> None:
    get_farm(user_id, farm_id)
    get_farms_table().delete_item(
        Key={"user_id": user_id, "farm_id": farm_id}
    )


def update_farm_fields(user_id: str, farm_id: str, fields: dict) -> Farm:
    if not fields:
        return get_farm(user_id, farm_id)

    fields = dict(fields)
    fields["updated_at"] = _now_iso()

    expr_parts = []
    names = {}
    values = {}
    for i, (key, value) in enumerate(fields.items()):
        placeholder = f"#f{i}"
        value_name = f":v{i}"
        names[placeholder] = key
        values[value_name] = value
        expr_parts.append(f"{placeholder} = {value_name}")

    get_farms_table().update_item(
        Key={"user_id": user_id, "farm_id": farm_id},
        UpdateExpression="SET " + ", ".join(expr_parts),
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=_to_dynamo(values),
    )

    return get_farm(user_id, farm_id)