import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import get_settings
from app.services.db import get_dynamodb_resource


def main() -> None:
    settings = get_settings()
    resource = get_dynamodb_resource()
    table_name = settings.farms_table_name

    existing = [t.name for t in resource.tables.all()]
    if table_name in existing:
        print(f"Table '{table_name}' already exists.")
        return

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
    print("Table created.")


if __name__ == "__main__":
    main()