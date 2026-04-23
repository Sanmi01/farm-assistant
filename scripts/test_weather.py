import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.services.weather import analyze_weather


def main() -> None:
    analysis = analyze_weather(latitude=7.3775, longitude=3.9470)
    print(analysis.model_dump_json(indent=2))


if __name__ == "__main__":
    main()