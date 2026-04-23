import httpx

from ..errors import ExternalServiceError
from ..logging import get_logger
from ..schemas import WeatherAnalysis

logger = get_logger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
FORECAST_DAYS = 16
REQUEST_TIMEOUT = 15.0


def _fetch_daily_data(latitude: float, longitude: float) -> dict:
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
        "hourly": "relative_humidity_2m",
        "timezone": "auto",
        "forecast_days": FORECAST_DAYS,
    }

    try:
        response = httpx.get(OPEN_METEO_URL, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("open_meteo_fetch_failed", error=str(exc))
        raise ExternalServiceError(f"Weather fetch failed: {exc}") from exc

    return response.json()


def _average(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _describe_trend(first: list[float], last: list[float]) -> str:
    if not first or not last:
        return "stable"
    diff = _average(last) - _average(first)
    if diff > 1.5:
        return "warming"
    if diff < -1.5:
        return "cooling"
    return "stable"


def _describe_rainfall(daily_rain: list[float]) -> str:
    if not daily_rain:
        return "dry"
    rainy_days = sum(1 for v in daily_rain if v > 1.0)
    pct = rainy_days / len(daily_rain)
    if pct > 0.5:
        return "frequent rain"
    if pct > 0.2:
        return "occasional rain"
    return "dry"


def _seasonal_pattern(daily_means: list[float], rain: list[float]) -> str:
    if len(daily_means) < 14:
        return "insufficient data for pattern analysis"

    first_week = daily_means[:7]
    last_week = daily_means[-7:]
    trend = _describe_trend(first_week, last_week)
    rain_summary = _describe_rainfall(rain)

    return f"{trend} trend with {rain_summary}"


def analyze_weather(latitude: float, longitude: float) -> WeatherAnalysis:
    """Fetch and aggregate 16 days of daily weather for the given location."""

    payload = _fetch_daily_data(latitude, longitude)

    daily = payload.get("daily") or {}
    hourly = payload.get("hourly") or {}

    t_max = daily.get("temperature_2m_max", []) or []
    t_min = daily.get("temperature_2m_min", []) or []
    rain = daily.get("precipitation_sum", []) or []
    wind = daily.get("wind_speed_10m_max", []) or []
    humidity_hourly = hourly.get("relative_humidity_2m", []) or []

    if not t_max or not t_min:
        raise ExternalServiceError("Open-Meteo returned no daily data")

    daily_means = [
        (mx + mn) / 2 for mx, mn in zip(t_max, t_min) if mx is not None and mn is not None
    ]

    analysis = WeatherAnalysis(
        status="completed",
        average_temperature=round(_average(daily_means), 1),
        total_precipitation=round(sum(rain), 1),
        average_humidity=round(_average(humidity_hourly), 1),
        average_wind_speed=round(_average(wind), 1),
        seasonal_pattern=_seasonal_pattern(daily_means, rain),
    )

    logger.info(
        "weather_analyzed",
        latitude=latitude,
        longitude=longitude,
        avg_temp=analysis.average_temperature,
        total_precip=analysis.total_precipitation,
        pattern=analysis.seasonal_pattern,
    )

    return analysis