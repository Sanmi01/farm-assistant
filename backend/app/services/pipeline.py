from datetime import datetime, timezone

from ..logging import get_logger
from ..schemas import AnalysisStatus, Recommendations, WeatherAnalysis
from . import farms_repo
from .recommender import generate_recommendations
from .weather import analyze_weather

logger = get_logger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _set_weather_status(user_id: str, farm_id: str, status: AnalysisStatus, **extras) -> None:
    data = {"status": status, **extras}
    farms_repo.update_farm_fields(user_id, farm_id, {"weather_analysis": data})


def _set_recommendations_status(user_id: str, farm_id: str, status: AnalysisStatus, **extras) -> None:
    data = {"status": status, **extras}
    farms_repo.update_farm_fields(user_id, farm_id, {"recommendations": data})


def run_weather_analysis(user_id: str, farm_id: str) -> WeatherAnalysis:
    farm = farms_repo.get_farm(user_id, farm_id)

    if farm.weather_analysis.status == "completed":
        logger.info("weather_skipped_already_complete", farm_id=farm_id)
        return farm.weather_analysis

    _set_weather_status(user_id, farm_id, "processing")

    try:
        analysis = analyze_weather(
            latitude=farm.location.latitude,
            longitude=farm.location.longitude,
        )
    except Exception as exc:
        logger.warning("weather_failed", farm_id=farm_id, error=str(exc))
        _set_weather_status(user_id, farm_id, "failed", error=str(exc))
        raise

    payload = analysis.model_dump()
    payload["analyzed_at"] = _now_iso()
    farms_repo.update_farm_fields(user_id, farm_id, {"weather_analysis": payload})
    logger.info("weather_persisted", farm_id=farm_id)

    return WeatherAnalysis(**payload)


def run_recommendations(user_id: str, farm_id: str) -> Recommendations:
    farm = farms_repo.get_farm(user_id, farm_id)

    if farm.recommendations.status == "completed":
        logger.info("recommendations_skipped_already_complete", farm_id=farm_id)
        return farm.recommendations

    if farm.weather_analysis.status != "completed":
        message = "Cannot generate recommendations before weather analysis completes"
        logger.warning("recommendations_blocked", farm_id=farm_id, reason=message)
        _set_recommendations_status(user_id, farm_id, "failed", error=message)
        raise RuntimeError(message)

    _set_recommendations_status(user_id, farm_id, "processing")

    try:
        recs = generate_recommendations(farm)
    except Exception as exc:
        logger.warning("recommendations_failed", farm_id=farm_id, error=str(exc))
        _set_recommendations_status(user_id, farm_id, "failed", error=str(exc))
        raise

    payload = recs.model_dump()
    payload["generated_at"] = _now_iso()
    farms_repo.update_farm_fields(user_id, farm_id, {"recommendations": payload})
    logger.info("recommendations_persisted", farm_id=farm_id)

    return Recommendations(**payload)


def run_full_pipeline(user_id: str, farm_id: str) -> None:
    logger.info("pipeline_started", farm_id=farm_id)

    try:
        run_weather_analysis(user_id, farm_id)
    except Exception:
        _set_recommendations_status(
            user_id,
            farm_id,
            "failed",
            error="Blocked by failed weather analysis",
        )
        logger.info("pipeline_aborted_after_weather", farm_id=farm_id)
        return

    try:
        run_recommendations(user_id, farm_id)
    except Exception:
        pass

    logger.info("pipeline_finished", farm_id=farm_id)