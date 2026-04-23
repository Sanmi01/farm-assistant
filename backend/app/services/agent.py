"""Agentic chat for a farm.

Given a farm and a user's message, runs an OpenAI tool-calling loop:

  1. The model sees the farm's profile, weather analysis, and recommendations
     already in the system prompt. Prior conversation history is included
     so it has short-term memory within the farm.
  2. On each turn, the model either requests a tool call (we execute, feed
     the result back, loop) or produces a text answer (we stream it).
  3. The loop terminates when the model's finish_reason is 'stop' or after
     MAX_TOOL_ITERATIONS, whichever comes first.

Only the user's message and the final assistant answer are persisted to the
chat table. Intermediate tool calls and tool results are in-memory only.
"""

import json
from datetime import date
from functools import lru_cache
from typing import Iterator

from openai import OpenAI

from ..config import get_settings
from ..errors import ExternalServiceError
from ..logging import get_logger
from ..schemas import ChatMessage, Farm
from . import chat_repo, farms_repo
from .weather_tool import get_weather_forecast

logger = get_logger(__name__)

MODEL = "gpt-4o-mini"
MAX_TOOL_ITERATIONS = 4
HISTORY_LIMIT = 20


# ---- Tool schema ----

WEATHER_TOOL = {
    "type": "function",
    "function": {
        "name": "get_weather_forecast",
        "description": (
            "Fetch daily weather forecast rows for the farm for a specific "
            "date range. Use this when the user asks about weather on a "
            "specific day or short window that is not covered by the farm's "
            "stored 16-day summary. Do not call it for questions that can "
            "be answered from the stored summary or recommendations."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "ISO date YYYY-MM-DD. The first day of the range.",
                },
                "end_date": {
                    "type": "string",
                    "description": "ISO date YYYY-MM-DD. The last day of the range.",
                },
            },
            "required": ["start_date", "end_date"],
            "additionalProperties": False,
        },
    },
}


# ---- OpenAI client ----


@lru_cache
def _client() -> OpenAI:
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)



def _build_system_prompt(farm: Farm) -> str:
    loc = farm.location
    location_text = loc.geo_address or loc.address or f"{loc.latitude}, {loc.longitude}"

    wa = farm.weather_analysis
    recs = farm.recommendations

    weather_block = (
        "Stored weather summary (generated when the farm was created):\n"
        f"  average temperature: {wa.average_temperature} degrees C\n"
        f"  total precipitation over 16 days: {wa.total_precipitation} mm\n"
        f"  average humidity: {wa.average_humidity}%\n"
        f"  average max wind: {wa.average_wind_speed} km/h\n"
        f"  seasonal pattern: {wa.seasonal_pattern}\n"
        if wa.status == "completed"
        else "Stored weather summary: not yet available.\n"
    )

    recs_block = (
        "Stored recommendations (generated when the farm was created):\n"
        f"  suggested crops: {', '.join(recs.suggested_crops) or 'none'}\n"
        f"  farming techniques: {', '.join(recs.farming_techniques) or 'none'}\n"
        f"  required services: {', '.join(recs.required_services) or 'none'}\n"
        f"  report: {recs.report or 'none'}\n"
        if recs.status == "completed"
        else "Stored recommendations: not yet available.\n"
    )

    return (
        "You are an agricultural advisor for one specific farm. Ground every "
        "answer in the farm's real profile and conditions. Never invent "
        "weather data, yields, or prices you have not been given.\n\n"
        f"Farm name: {farm.name}\n"
        f"Location: {location_text} (lat {loc.latitude}, lng {loc.longitude})\n"
        f"Land size: {farm.land_size.value} {farm.land_size.unit}\n"
        f"Budget: {farm.budget.amount} {farm.budget.currency}\n\n"
        f"{weather_block}\n"
        f"{recs_block}\n"
        "You have a tool, get_weather_forecast, which fetches daily weather "
        "rows for a specific date range. Call it only when the user asks "
        "about a specific day or short window that is not already covered "
        "by the stored summary. For questions already answerable from the "
        "stored profile or recommendations, answer directly without any "
        "tool call. If the tool returns a 'note' explaining the window was "
        "clamped, state that clearly so the user knows what data you used. "
        f"Today's date is {date.today().isoformat()}."
    )


# ---- Tool dispatch ----


def _execute_tool_call(farm: Farm, name: str, arguments: dict) -> dict:
    """Run a tool and return a JSON-serialisable dict for the model."""
    if name == "get_weather_forecast":
        start = date.fromisoformat(arguments["start_date"])
        end = date.fromisoformat(arguments["end_date"])
        result = get_weather_forecast(
            latitude=farm.location.latitude,
            longitude=farm.location.longitude,
            start_date=start,
            end_date=end,
        )
        return json.loads(result.model_dump_json())

    raise ValueError(f"Unknown tool: {name}")




def _history_to_openai_messages(history: list[ChatMessage]) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in history]



def stream_chat_response(
    user_id: str,
    farm_id: str,
    user_message: str,
) -> Iterator[str]:
    farm = farms_repo.get_farm(user_id, farm_id)

    chat_repo.append_message(farm_id, user_id, "user", user_message)

    history = chat_repo.list_messages(farm_id, limit=HISTORY_LIMIT)

    messages: list[dict] = [{"role": "system", "content": _build_system_prompt(farm)}]
    messages.extend(_history_to_openai_messages(history))

    client = _client()
    final_text_parts: list[str] = []

    for iteration in range(MAX_TOOL_ITERATIONS):
        decision = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=[WEATHER_TOOL],
            tool_choice="auto",
        )
        choice = decision.choices[0]

        if choice.finish_reason == "tool_calls":
            tool_calls = choice.message.tool_calls or []
            messages.append(
                {
                    "role": "assistant",
                    "content": choice.message.content or "",
                    "tool_calls": [tc.model_dump() for tc in tool_calls],
                }
            )
            for tc in tool_calls:
                name = tc.function.name
                try:
                    arguments = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    arguments = {}

                try:
                    result = _execute_tool_call(farm, name, arguments)
                    payload = json.dumps(result, default=str)
                except Exception as exc:
                    logger.warning(
                        "tool_call_failed",
                        tool=name,
                        error=str(exc),
                        arguments=arguments,
                    )
                    payload = json.dumps({"error": str(exc)})

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": payload,
                    }
                )

                logger.info(
                    "tool_call_executed",
                    tool=name,
                    iteration=iteration,
                    farm_id=farm_id,
                )
            # Loop back to let the model react to the tool results.
            continue

        # No tool call requested. Stream the final answer for this turn.
        stream = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=[WEATHER_TOOL],
            tool_choice="none",
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta
            token = delta.content or ""
            if token:
                final_text_parts.append(token)
                yield token
        break
    else:
        logger.warning(
            "agent_max_iterations_reached",
            farm_id=farm_id,
            iterations=MAX_TOOL_ITERATIONS,
        )
        fallback = (
            "I couldn't finish reasoning about that question within my tool-"
            "call budget. Could you rephrase or ask more specifically?"
        )
        final_text_parts.append(fallback)
        yield fallback

    final_text = "".join(final_text_parts).strip()
    if not final_text:
        raise ExternalServiceError("Agent produced no final answer")

    chat_repo.append_message(farm_id, user_id, "assistant", final_text)
    logger.info(
        "chat_turn_complete",
        farm_id=farm_id,
        tool_iterations=iteration,
        response_length=len(final_text),
    )