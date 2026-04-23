import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.services import chat_repo


def main() -> None:
    farm_id = "smoke-farm-001"
    user_id = "smoke-user-001"

    chat_repo.append_message(farm_id, user_id, "user", "What crops should I plant?")
    chat_repo.append_message(
        farm_id, user_id, "assistant", "Cassava and maize are strong options."
    )
    chat_repo.append_message(farm_id, user_id, "user", "What about irrigation?")

    messages = chat_repo.list_messages(farm_id)
    print(f"Retrieved {len(messages)} messages in order:")
    for m in messages:
        print(f"  [{m.role}] {m.content}")

    deleted = chat_repo.delete_farm_messages(farm_id)
    print(f"Deleted {deleted} messages.")

    remaining = chat_repo.list_messages(farm_id)
    print(f"Remaining after delete: {len(remaining)}")


if __name__ == "__main__":
    main()