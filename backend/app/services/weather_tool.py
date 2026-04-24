"""Weather tool exposed to the chat agent.

Wraps Open-Meteo's forecast endpoint with a date-range interface that
covers both recent history and the upcoming forecast. The agent can
request any range; we clamp it to what the API supports
(today - 92 days through today + 15 days) and report back the window
we fetched so the model can be honest about what it looked at.

Note on historical data: Open-Meteo's forecast endpoint with past
dates returns past model forecasts, not measured conditions. For
agricultural decision-making this is accurate enough, but it's not
ground-truth reanalysis data.
"""

from datetime import date, timedelta

import httpx
from pydantic import BaseModel, Field

from ..errors import ExternalServiceError
from ..logging import get_logger

logger = get_logger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
MAX_FORECAST_DAYS = 16
MAX_PAST_DAYS = 92
REQUEST_TIMEOUT = 15.0


class DailyForecastRow(BaseModel):
    date: date
    temperature_max: float | None = None
    temperature_min: float | None = None
    precipitation_mm: float | None = None
    wind_speed_max: float | None = None


class WeatherToolResult(BaseModel):
    latitude: float
    longitude: float
    requested_start: date
    requested_end: date
    fetched_start: date
    fetched_end: date
    note: str | None = Field(
        default=None,
        description="Populated when requested range had to be clamped.",
    )
    days: list[DailyForecastRow]


def _clamp_range(start: date, end: date) -> tuple[date, date, str | None]:
    today = date.today()
    earliest = today - timedelta(days=MAX_PAST_DAYS)
    horizon = today + timedelta(days=MAX_FORECAST_DAYS - 1)

    original_start, original_end = start, end
    clamped_start = max(start, earliest)
    clamped_end = min(end, horizon)

    if clamped_start > clamped_end:
        if original_end < earliest:
            clamped_start = earliest
            clamped_end = earliest + timedelta(days=6)
        else:
            clamped_start = today
            clamped_end = min(today + timedelta(days=6), horizon)

    note = None
    if (clamped_start, clamped_end) != (original_start, original_end):
        note = (
            f"Requested {original_start.isoformat()} to {original_end.isoformat()} "
            f"is outside the available weather window. Returning "
            f"{clamped_start.isoformat()} to {clamped_end.isoformat()} instead."
        )

    return clamped_start, clamped_end, note


def get_weather_forecast(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> WeatherToolResult:
    if start_date > end_date:
        raise ValueError("start_date must be on or before end_date")

    fetched_start, fetched_end, note = _clamp_range(start_date, end_date)

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": ",".join(
            [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "wind_speed_10m_max",
            ]
        ),
        "timezone": "auto",
        "start_date": fetched_start.isoformat(),
        "end_date": fetched_end.isoformat(),
    }

    try:
        response = httpx.get(OPEN_METEO_URL, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("weather_tool_fetch_failed", error=str(exc))
        raise ExternalServiceError(f"Weather tool fetch failed: {exc}") from exc

    payload = response.json().get("daily") or {}
    dates = payload.get("time", []) or []
    t_max = payload.get("temperature_2m_max", []) or []
    t_min = payload.get("temperature_2m_min", []) or []
    rain = payload.get("precipitation_sum", []) or []
    wind = payload.get("wind_speed_10m_max", []) or []

    rows: list[DailyForecastRow] = []
    for i, d in enumerate(dates):
        rows.append(
            DailyForecastRow(
                date=date.fromisoformat(d),
                temperature_max=t_max[i] if i < len(t_max) else None,
                temperature_min=t_min[i] if i < len(t_min) else None,
                precipitation_mm=rain[i] if i < len(rain) else None,
                wind_speed_max=wind[i] if i < len(wind) else None,
            )
        )

    result = WeatherToolResult(
        latitude=latitude,
        longitude=longitude,
        requested_start=start_date,
        requested_end=end_date,
        fetched_start=fetched_start,
        fetched_end=fetched_end,
        note=note,
        days=rows,
    )

    logger.info(
        "weather_tool_fetched",
        latitude=latitude,
        longitude=longitude,
        requested=f"{start_date}..{end_date}",
        fetched=f"{fetched_start}..{fetched_end}",
        days=len(rows),
        clamped=bool(note),
    )

    return result