import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import get_settings
from app.services.db import get_dynamodb_resource 


def _create_farms_table(resource, table_name: str) -> None:
    print(f"Creating table '{table_name}'...")
    table = resource.create_table(
        TableName=table_name,
        KeySchema=[
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "farm_id", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "farm_id", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    table.wait_until_exists()
    print(f"Table '{table_name}' created.")


def _create_chat_table(resource, table_name: str) -> None:
    print(f"Creating table '{table_name}'...")
    table = resource.create_table(
        TableName=table_name,
        KeySchema=[
            {"AttributeName": "farm_id", "KeyType": "HASH"},
            {"AttributeName": "sort_key", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "farm_id", "AttributeType": "S"},
            {"AttributeName": "sort_key", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    table.wait_until_exists()
    print(f"Table '{table_name}' created.")


def main() -> None:
    settings = get_settings()
    resource = get_dynamodb_resource()
    existing = [t.name for t in resource.tables.all()]

    for name, creator in (
        (settings.farms_table_name, _create_farms_table),
        (settings.chat_table_name, _create_chat_table),
    ):
        if name in existing:
            print(f"Table '{name}' already exists.")
            continue
        creator(resource, name)


if __name__ == "__main__":
    main()