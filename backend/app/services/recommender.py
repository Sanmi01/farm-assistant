from functools import lru_cache

from openai import OpenAI
from pydantic import BaseModel, Field

from ..config import get_settings
from ..errors import ExternalServiceError
from ..logging import get_logger
from ..schemas import Farm, Recommendations

logger = get_logger(__name__)

MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = (
    "You are an expert agricultural advisor. You give practical, grounded, "
    "budget-aware recommendations for real farms in specific climates. Your "
    "suggestions must be short labels for list items (two or three words) "
    "and a longer narrative only in the report field. Never invent weather "
    "data the user did not provide."
)


class RecommendationSchema(BaseModel):
    """The exact shape the model is required to return."""

    suggested_crops: list[str] = Field(
        ...,
        min_length=3,
        max_length=5,
        description="Three to five short crop names, e.g. 'Maize', 'Cassava'.",
    )
    farming_techniques: list[str] = Field(
        ...,
        min_length=3,
        max_length=5,
        description="Three to five short technique names, e.g. 'Drip Irrigation'.",
    )
    required_services: list[str] = Field(
        ...,
        min_length=3,
        max_length=5,
        description="Three to five short service names, e.g. 'Soil Testing'.",
    )
    report: str = Field(
        ...,
        min_length=200,
        description=(
            "A 200 to 350 word narrative, written in the second person to the "
            "farmer, explaining the recommendations in light of their budget, "
            "land size, and weather conditions."
        ),
    )


@lru_cache
def _client() -> OpenAI:
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)


def _user_prompt(farm: Farm) -> str:
    loc = farm.location
    location_text = loc.geo_address or loc.address or f"{loc.latitude}, {loc.longitude}"
    wa = farm.weather_analysis

    return (
        f"Farm name: {farm.name}\n"
        f"Location: {location_text}\n"
        f"Land size: {farm.land_size.value} {farm.land_size.unit}\n"
        f"Budget: {farm.budget.amount} {farm.budget.currency}\n"
        f"Average temperature: {wa.average_temperature} °C\n"
        f"Total precipitation (16 days): {wa.total_precipitation} mm\n"
        f"Average humidity: {wa.average_humidity}%\n"
        f"Average max wind: {wa.average_wind_speed} km/h\n"
        f"Seasonal pattern: {wa.seasonal_pattern}\n\n"
        "Produce crop suggestions, farming techniques, required services, and "
        "a grounded 200-350 word narrative report for this farm."
    )


def generate_recommendations(farm: Farm) -> Recommendations:
    """Generate structured recommendations for a farm.

    Requires weather_analysis.status == 'completed' because the prompt embeds
    the weather summary. If the weather analysis is missing, raise rather
    than ask the model to invent values.
    """

    if farm.weather_analysis.status != "completed":
        raise ExternalServiceError(
            "Weather analysis must be completed before generating recommendations"
        )

    try:
        completion = _client().beta.chat.completions.parse(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _user_prompt(farm)},
            ],
            response_format=RecommendationSchema,
            metadata={"purpose": "recommender", "farm_id": farm.id},
            store=True,
        )
    except Exception as exc:
        logger.error("recommender_failed", error=str(exc))
        raise ExternalServiceError(f"Recommendation generation failed: {exc}") from exc

    parsed = completion.choices[0].message.parsed
    if parsed is None:
        logger.error("recommender_refused", finish_reason=completion.choices[0].finish_reason)
        raise ExternalServiceError("Model refused or failed to produce structured output")

    recommendations = Recommendations(
        status="completed",
        suggested_crops=parsed.suggested_crops,
        farming_techniques=parsed.farming_techniques,
        required_services=parsed.required_services,
        report=parsed.report,
    )

    logger.info(
        "recommendations_generated",
        farm_id=farm.id,
        crops=len(parsed.suggested_crops),
        techniques=len(parsed.farming_techniques),
        services=len(parsed.required_services),
        report_length=len(parsed.report),
    )

    return recommendations