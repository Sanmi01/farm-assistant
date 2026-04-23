import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.services.weather_tool import get_weather_forecast


def case(label: str, start: date, end: date) -> None:
    print(f"\n=== {label} ===")
    result = get_weather_forecast(
        latitude=7.3775,
        longitude=3.9470,
        start_date=start,
        end_date=end,
    )
    print(f"Requested: {result.requested_start}..{result.requested_end}")
    print(f"Fetched:   {result.fetched_start}..{result.fetched_end}")
    if result.note:
        print(f"Note: {result.note}")
    print(f"Rows returned: {len(result.days)}")
    if result.days:
        first = result.days[0]
        last = result.days[-1]
        print(
            f"First day: {first.date} tmax={first.temperature_max} "
            f"rain={first.precipitation_mm}"
        )
        print(
            f"Last day:  {last.date} tmax={last.temperature_max} "
            f"rain={last.precipitation_mm}"
        )


def main() -> None:
    today = date.today()

    # 1. Normal 7-day ask inside the window.
    case("next 7 days", today, today + timedelta(days=6))

    # 2. Ask that hangs off the end; should clamp.
    case("next 30 days (past horizon)", today, today + timedelta(days=29))

    # 3. Ask entirely in the past; should fall back to a safe window.
    case("last week (past)", today - timedelta(days=14), today - timedelta(days=7))


if __name__ == "__main__":
    main()