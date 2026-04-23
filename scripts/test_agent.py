import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.schemas import (
    CreateFarmRequest,
    FarmBudget,
    FarmLandSize,
    FarmLocation,
)
from app.services import farms_repo
from app.services.agent import stream_chat_response
from app.services.pipeline import run_full_pipeline


USER_ID = "stub-user-001"


def create_and_analyze_farm() -> str:
    request = CreateFarmRequest(
        name="Agent Smoke Farm",
        location=FarmLocation(
            latitude=7.3775,
            longitude=3.9470,
            address="Ibadan, Oyo, Nigeria",
        ),
        land_size=FarmLandSize(value=5, unit="acres"),
        budget=FarmBudget(amount=10000, currency="USD"),
    )
    farm = farms_repo.create_farm(USER_ID, request)
    print(f"Created farm {farm.id}, running pipeline...")
    run_full_pipeline(USER_ID, farm.id)
    print("Pipeline done.\n")
    return farm.id


def ask(farm_id: str, question: str) -> None:
    print(f"\n[USER] {question}")
    print("[ASSISTANT] ", end="", flush=True)
    for token in stream_chat_response(USER_ID, farm_id, question):
        print(token, end="", flush=True)
    print()


def main() -> None:
    farm_id = create_and_analyze_farm()

    # Should answer from stored context — no tool call expected.
    ask(farm_id, "What crops did you recommend and why?")

    # Should trigger a tool call — asks about a specific short window.
    ask(farm_id, "Will it rain in the next 3 days?")

    # Follow-up using conversation memory.
    ask(farm_id, "Given that, should I plant this weekend?")

    print(f"\nDone. Farm id: {farm_id}")


if __name__ == "__main__":
    main()