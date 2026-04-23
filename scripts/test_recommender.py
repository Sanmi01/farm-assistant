import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.schemas import (
    Farm,
    FarmBudget,
    FarmLandSize,
    FarmLocation,
    WeatherAnalysis,
)
from app.services.recommender import generate_recommendations
from app.services.weather import analyze_weather


def main() -> None:
    # Fetch real weather for Ibadan to make the prompt meaningful.
    weather = analyze_weather(latitude=7.3775, longitude=3.9470)

    now = datetime.now(timezone.utc)
    farm = Farm(
        id="smoke-test-farm",
        user_id="smoke-test-user",
        name="Alabi Farms",
        location=FarmLocation(
            latitude=7.3775,
            longitude=3.9470,
            address="Ibadan, Oyo, Nigeria",
        ),
        land_size=FarmLandSize(value=5, unit="acres"),
        budget=FarmBudget(amount=10000, currency="USD"),
        weather_analysis=weather,
        created_at=now,
        updated_at=now,
    )

    recs = generate_recommendations(farm)
    print(recs.model_dump_json(indent=2))


if __name__ == "__main__":
    main()