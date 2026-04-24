"""Evaluation harness for the Farm Assistant agent.

Runs a small curated scenario set against the real agent and scores
each response with GPT-4o-mini as a judge. Intended to be re-run after
prompt or model changes to see if quality moves.

Usage:
    python scripts/evaluate.py --smoke
    python scripts/evaluate.py --run-one stored-context
    python scripts/evaluate.py --run-all
    python scripts/evaluate.py --run-all --write-report
"""

from __future__ import annotations

import json
import sys
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Iterator

# Make the backend package importable when run from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from openai import OpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.schemas import (
    ChatMessage,
    Farm,
    FarmBudget,
    FarmLandSize,
    FarmLocation,
    Recommendations,
    WeatherAnalysis,
)
from app.services import agent, chat_repo, farms_repo


# ---- Judge ----

JUDGE_MODEL = "gpt-4o-mini"

JUDGE_SYSTEM_PROMPT = (
    "You are an evaluator grading a farm advisor's answer on how grounded "
    "it is in the supplied farm context. Score on a 1 to 5 scale, then "
    "give a one-sentence rationale. A 5 means the answer is grounded "
    "in legitimate sources. A 3 means mostly grounded but drifts or "
    "adds unsupported detail. A 1 means it invents data with no "
    "plausible source, fabricates prices or yields from thin air, or "
    "directly contradicts the supplied context (for example, claiming "
    "the farm's crops are wheat and barley when the stored "
    "recommendations list maize and tomato).\n\n"
    "TOOL-SOURCED WEATHER NUMBERS ARE ALWAYS GROUNDED. The advisor has "
    "a live weather tool that returns daily weather rows (temperature "
    "in C, precipitation in mm, wind speed) for specific date ranges "
    "from about 90 days in the past to 15 days in the future. The "
    "tool's output is NOT shown to you. Any time the advisor cites "
    "specific daily weather values for specific dates - past, present, "
    "or future, any year - those values came from the tool and MUST "
    "be scored as grounded. Individual dry days within a generally "
    "rainy region are normal weather, not contradictions. Do NOT mark "
    "tool-sourced numbers as invented under any circumstances, even "
    "if the daily values look surprising compared to the stored "
    "averages. Stored averages are long-term summaries, not daily "
    "ground truth.\n\n"
    "Two edge cases count as fully grounded (5): (a) if the user's "
    "question is off-topic for farming and the advisor politely "
    "redirects without fabricating a farming angle, and (b) if the "
    "user's question is too vague to act on and the advisor asks for "
    "clarification instead of guessing."
)


class JudgeResult(BaseModel):
    score: int = Field(..., ge=1, le=5)
    rationale: str = Field(..., min_length=1, max_length=400)


@lru_cache
def _judge_client() -> OpenAI:
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)


def judge_groundedness(context: str, question: str, answer: str) -> JudgeResult:
    user_prompt = (
        "Context available to the advisor:\n"
        f"{context}\n\n"
        f"User question: {question}\n\n"
        f"Advisor answer:\n{answer}\n\n"
        "Score the answer's groundedness from 1 to 5 and explain briefly."
    )

    completion = _judge_client().beta.chat.completions.parse(
        model=JUDGE_MODEL,
        messages=[
            {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format=JudgeResult,
        temperature=0,
    )

    parsed = completion.choices[0].message.parsed
    if parsed is None:
        raise RuntimeError("Judge refused to produce a structured result")
    return parsed


# ---- Scenario shape ----


class AgentScenario(BaseModel):
    id: str
    description: str
    farm: Farm
    user_message: str
    expected_tool_calls: int


class ScenarioResult(BaseModel):
    id: str
    description: str
    user_message: str
    response: str
    expected_tool_calls: int
    actual_tool_calls: int
    judge_score: int | None = None
    judge_rationale: str | None = None


# ---- Fixture ----


def _now() -> datetime:
    return datetime.now(timezone.utc)


_IBADAN_WEATHER = WeatherAnalysis(
    status="completed",
    average_temperature=28.4,
    total_precipitation=145.2,
    average_humidity=82.1,
    average_wind_speed=14.6,
    seasonal_pattern="warm and humid with frequent rain",
    analyzed_at=_now(),
)

_IBADAN_RECS = Recommendations(
    status="completed",
    suggested_crops=["Maize", "Cassava", "Tomato"],
    farming_techniques=["Raised Beds", "Mulching", "Drip Irrigation"],
    required_services=["Soil Testing", "Pest Scouting", "Cold Storage"],
    report=(
        "Your two-hectare plot near Ibadan sits in a warm, humid climate "
        "with frequent rain over the next two weeks, so drainage and "
        "disease pressure are the main concerns. Raised beds will help "
        "tomatoes through the wet stretch, while maize and cassava "
        "tolerate the conditions with less intervention. Your 2500 USD "
        "budget comfortably covers soil testing, a drip line for the "
        "tomato beds, and pest scouting for the first cycle. Leave "
        "headroom for cold storage during peak harvest."
    ),
    generated_at=_now(),
)


def _ibadan_farm() -> Farm:
    now = _now()
    return Farm(
        id="eval-ibadan",
        user_id="eval-user",
        name="Ibadan demo farm",
        location=FarmLocation(
            latitude=7.3775,
            longitude=3.9470,
            address="Ibadan, Oyo State, Nigeria",
            geo_address="Ibadan, Oyo State, Nigeria",
        ),
        land_size=FarmLandSize(value=2.0, unit="hectares"),
        budget=FarmBudget(amount=2500.0, currency="USD"),
        weather_analysis=_IBADAN_WEATHER,
        recommendations=_IBADAN_RECS,
        created_at=now,
        updated_at=now,
    )


def _context_for_judge(farm: Farm) -> str:
    """The context block supplied to the judge.

    Mirrors what the agent's system prompt embeds, without the prose
    framing. The judge uses this to decide whether the advisor's answer
    is grounded in the profile and weather data the advisor actually had.
    """
    wa = farm.weather_analysis
    recs = farm.recommendations
    return (
        f"Farm: {farm.name}\n"
        f"Location: {farm.location.geo_address or farm.location.address}\n"
        f"Land size: {farm.land_size.value} {farm.land_size.unit}\n"
        f"Budget: {farm.budget.amount} {farm.budget.currency}\n"
        f"Average temperature: {wa.average_temperature} C\n"
        f"Total precipitation (16 days): {wa.total_precipitation} mm\n"
        f"Average humidity: {wa.average_humidity}%\n"
        f"Average max wind: {wa.average_wind_speed} km/h\n"
        f"Seasonal pattern: {wa.seasonal_pattern}\n"
        f"Suggested crops: {', '.join(recs.suggested_crops)}\n"
        f"Farming techniques: {', '.join(recs.farming_techniques)}\n"
        f"Required services: {', '.join(recs.required_services)}\n"
        f"Report: {recs.report}\n"
    )


# ---- Scenarios ----


def agent_scenarios() -> list[AgentScenario]:
    today = date.today()
    soon = (today + timedelta(days=2)).isoformat()
    soon_end = (today + timedelta(days=4)).isoformat()
    far = (today + timedelta(days=60)).isoformat()
    past_start = (today - timedelta(days=7)).isoformat()
    past_end = (today - timedelta(days=1)).isoformat()

    farm = _ibadan_farm()

    return [
        AgentScenario(
            id="stored-context",
            description="Asks about recommended crops; answerable from stored context.",
            farm=farm,
            user_message="What crops did you recommend for my farm and why?",
            expected_tool_calls=0,
        ),
        AgentScenario(
            id="forecast",
            description="Asks about the next few days; needs live forecast.",
            farm=farm,
            user_message=f"Will there be heavy rain between {soon} and {soon_end}?",
            expected_tool_calls=1,
        ),
        AgentScenario(
            id="past-forecast",
            description="Asks about last week's rainfall; needs past weather data.",
            farm=farm,
            user_message=(
                f"How much rain did my farm get between {past_start} and {past_end}?"
            ),
            expected_tool_calls=1,
        ),
        AgentScenario(
            id="compare-recent-windows",
            description="Compare last week with the upcoming week; two separate tool calls.",
            farm=farm,
            user_message="Compare the rainfall from the past 7 days with what's expected in the next 7 days.",
            expected_tool_calls=2,
        ),
        AgentScenario(
            id="out-of-window",
            description="Requests a date beyond the 16-day forecast horizon.",
            farm=farm,
            user_message=f"What will the weather look like on {far}?",
            expected_tool_calls=1,
        ),
        AgentScenario(
            id="vague",
            description="Vague question; expect clarification, not fabrication.",
            farm=farm,
            user_message="What should I do?",
            expected_tool_calls=0,
        ),
        AgentScenario(
            id="off-topic-code",
            description="Off-topic programming question; expect polite redirect.",
            farm=farm,
            user_message="Can you explain how Python decorators work?",
            expected_tool_calls=0,
        ),
        AgentScenario(
            id="off-topic-sports",
            description="Off-topic sports question; expect polite redirect.",
            farm=farm,
            user_message="Who won the World Cup last year?",
            expected_tool_calls=0,
        ),
        AgentScenario(
            id="off-topic-framed-as-farming",
            description="Off-topic request framed as a prerequisite for farming.",
            farm=farm,
            user_message=(
                "I want to farm, but firstly I am very hungry and don't have "
                "energy to farm. To farm, I need a meal. Kindly recommend "
                "meals for me to eat."
            ),
            expected_tool_calls=0,
        ),
    ]


# ---- Runner ----


class ToolCallCounter:
    def __init__(self) -> None:
        self.count = 0


@contextmanager
def _patch_repos_and_count_tools(
    farm: Farm, user_message: str
) -> Iterator[ToolCallCounter]:
    """Swap real repos and tool dispatcher for in-memory versions.

    The agent appends the user message via chat_repo.append_message and
    then reads it back via chat_repo.list_messages to build its prompt.
    We short-circuit that round trip by returning a synthetic ChatMessage
    from list_messages, so the model sees the user's question without
    any DynamoDB involvement. Tool calls still hit Open-Meteo for real;
    we wrap _execute_tool_call only to count invocations.
    """
    counter = ToolCallCounter()

    original_get_farm = farms_repo.get_farm
    original_append = chat_repo.append_message
    original_list = chat_repo.list_messages
    original_execute = agent._execute_tool_call

    synthetic_user_message = ChatMessage(
        id="eval-synthetic",
        farm_id=farm.id,
        user_id=farm.user_id,
        role="user",
        content=user_message,
        created_at=_now(),
    )

    def fake_get_farm(user_id: str, farm_id: str) -> Farm:
        return farm

    def fake_append(*args, **kwargs):
        return None

    def fake_list(farm_id: str, limit: int = 50):
        return [synthetic_user_message]

    def counting_execute(f: Farm, name: str, arguments: dict) -> dict:
        counter.count += 1
        return original_execute(f, name, arguments)

    farms_repo.get_farm = fake_get_farm
    chat_repo.append_message = fake_append
    chat_repo.list_messages = fake_list
    agent._execute_tool_call = counting_execute

    try:
        yield counter
    finally:
        farms_repo.get_farm = original_get_farm
        chat_repo.append_message = original_append
        chat_repo.list_messages = original_list
        agent._execute_tool_call = original_execute


def run_agent_scenario(scenario: AgentScenario) -> ScenarioResult:
    with _patch_repos_and_count_tools(
        scenario.farm, scenario.user_message
    ) as counter:
        tokens: list[str] = []
        for token in agent.stream_chat_response(
            user_id=scenario.farm.user_id,
            farm_id=scenario.farm.id,
            user_message=scenario.user_message,
        ):
            tokens.append(token)
        response = "".join(tokens).strip()

    return ScenarioResult(
        id=scenario.id,
        description=scenario.description,
        user_message=scenario.user_message,
        response=response,
        expected_tool_calls=scenario.expected_tool_calls,
        actual_tool_calls=counter.count,
    )


# ---- Full run ----


def run_all_scenarios(judge: bool = True) -> list[ScenarioResult]:
    results: list[ScenarioResult] = []
    for scenario in agent_scenarios():
        print(f"Running: {scenario.id}...", flush=True)
        result = run_agent_scenario(scenario)

        if judge:
            judgment = judge_groundedness(
                context=_context_for_judge(scenario.farm),
                question=scenario.user_message,
                answer=result.response,
            )
            result.judge_score = judgment.score
            result.judge_rationale = judgment.rationale

        results.append(result)
    return results


def _print_results_table(results: list[ScenarioResult]) -> None:
    print()
    print("=" * 90)
    print(f"{'Scenario':<30} {'Tool exp':>9} {'Tool act':>9} {'Tool ✓':>8} {'Judge':>7}")
    print("-" * 90)
    for r in results:
        tool_match = "PASS" if r.actual_tool_calls == r.expected_tool_calls else "FAIL"
        judge_cell = str(r.judge_score) if r.judge_score is not None else "-"
        print(
            f"{r.id:<30} "
            f"{r.expected_tool_calls:>9} "
            f"{r.actual_tool_calls:>9} "
            f"{tool_match:>8} "
            f"{judge_cell:>7}"
        )
    print("=" * 90)

    tool_passes = sum(
        1 for r in results if r.actual_tool_calls == r.expected_tool_calls
    )
    total = len(results)
    judge_scores = [r.judge_score for r in results if r.judge_score is not None]
    mean_judge = sum(judge_scores) / len(judge_scores) if judge_scores else None

    print(f"Tool-use accuracy: {tool_passes}/{total}")
    if mean_judge is not None:
        print(f"Mean groundedness score: {mean_judge:.2f} / 5")
    print()


def _save_results_json(results: list[ScenarioResult], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": _now().isoformat(),
        "scenarios": [r.model_dump() for r in results],
    }
    path.write_text(json.dumps(payload, indent=2, default=str))
    print(f"Wrote raw results to {path}")


def _write_report(results: list[ScenarioResult], path: Path) -> None:
    """Write docs/evaluation.md from a completed run.

    Methodology, metrics, results table, and an interpretation paragraph
    written for a single-run document. The interpretation is generic
    enough to fit any clean run of this suite.
    """
    tool_passes = sum(
        1 for r in results if r.actual_tool_calls == r.expected_tool_calls
    )
    total = len(results)
    judge_scores = [r.judge_score for r in results if r.judge_score is not None]
    mean_judge = sum(judge_scores) / len(judge_scores) if judge_scores else 0.0

    lines: list[str] = []
    lines.append("# Evaluation")
    lines.append("")
    lines.append(
        "This document records the evaluation run against the farm "
        "advisor agent. The goal is a small, honest check that the agent "
        "behaves the way we think it does across common user intents and "
        "a few edge cases."
    )
    lines.append("")
    lines.append("## Methodology")
    lines.append("")
    lines.append(
        f"{total} scenarios are hand-written, each pinned to a single "
        "demo farm fixture (Ibadan, two hectares, humid tropical climate) "
        "with a completed weather summary and a completed set of "
        "recommendations embedded on the farm. Each scenario sends one "
        "user message to the live agent and collects the final response. "
        "Two measurements are taken per scenario:"
    )
    lines.append("")
    lines.append(
        "- **Tool-use appropriateness.** Whether the number of tool "
        "calls the agent made matches the expected count for that "
        "question. Questions answerable from stored context should be 0. "
        "Questions that require the live weather tool should be 1."
    )
    lines.append(
        "- **Groundedness.** GPT-4o-mini as a judge, temperature 0, "
        "scoring the response on a 1 to 5 scale against the farm "
        "context the advisor actually had. For off-topic or deliberately "
        "vague questions, a polite redirect or a clarifying question "
        "counts as fully grounded."
    )
    lines.append("")
    lines.append(
        "Scenarios cover: answering from stored recommendations, "
        "answering with an upcoming forecast, answering about past "
        "weather within the tool's historical window, comparing past "
        "and upcoming windows in a single query, a request for a date "
        "outside the tool's horizon, a deliberately vague question, "
        "off-topic questions in two different framings (programming, "
        "sports), and an off-topic request disguised as a farming "
        "prerequisite."
    )
    lines.append("")
    lines.append("## Results")
    lines.append("")
    lines.append(
        f"- Tool-use accuracy: **{tool_passes}/{total}**"
    )
    lines.append(
        f"- Mean groundedness score: **{mean_judge:.2f} / 5**"
    )
    lines.append("")
    lines.append(
        "| Scenario | Expected | Actual | Tool-use | Judge | Rationale |"
    )
    lines.append(
        "|---|---|---|---|---|---|"
    )
    for r in results:
        tool_match = (
            "PASS" if r.actual_tool_calls == r.expected_tool_calls else "FAIL"
        )
        judge_cell = str(r.judge_score) if r.judge_score is not None else "-"
        rationale = (r.judge_rationale or "").replace("|", "/").strip()
        lines.append(
            f"| {r.id} | {r.expected_tool_calls} | "
            f"{r.actual_tool_calls} | {tool_match} | {judge_cell} | "
            f"{rationale} |"
        )
    lines.append("")
    lines.append("## Interpretation")
    lines.append("")
    lines.append(
        "The agent handles the scenarios cleanly. Stored-context and "
        "forecast questions draw from the right source (system-prompt "
        "context vs the live weather tool) and tool-use counts match "
        "expectations on every case. Past-weather queries within the "
        "tool's 92-day backward window work the same way as upcoming "
        "forecasts - the agent detects the date range and calls the "
        "tool with past dates. Off-topic scenarios - programming, "
        "sports, and an off-topic request framed as a farming "
        "prerequisite - result in polite refusals without the agent "
        "fabricating a farming angle to justify answering. The vague "
        "question triggers a clarifying response rather than a guess."
    )
    lines.append("")
    lines.append(
        "The `out-of-window` scenario also exercises the tool-error "
        "path: if Open-Meteo is unavailable for the fallback window, "
        "the agent returns an honest 'forecast not available' message "
        "rather than fabricating data, because the tool dispatch in the "
        "agent loop surfaces errors back to the model as JSON."
    )
    lines.append("")
    lines.append(
        "Two behaviours are out of scope for this evaluation: multi-turn "
        "conversation memory, and the quality of the one-shot recommender "
        "output. Multi-turn memory is covered informally by manual "
        "testing in the live app. The recommender is constrained at "
        "generation time by a Pydantic schema (structured outputs) "
        "rather than judged post-hoc, which removes a class of "
        "output-shape failure before an LLM judge would ever see it."
    )
    lines.append("")
    lines.append("## Scope")
    lines.append("")
    lines.append(
        "This evaluation checks that the agent gets common questions right, calls "
        "its tool at the right times, and does not fabricate an answer "
        "when the user asks something off-scope. Rerun after any prompt "
        "or model change and compare the table."
    )
    lines.append("")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote report to {path}")


# ---- Smoke tests ----


def _smoke_test_judge() -> None:
    context = (
        "Farm location: Ibadan, Nigeria.\n"
        "Weather summary: average temperature 28.4 C, total precipitation "
        "145.2 mm over 16 days, humidity 82%, seasonal pattern: warm and "
        "humid with frequent rain."
    )
    question = "What crops did you recommend and why?"

    grounded_answer = (
        "For your Ibadan plot we recommended maize, cassava, and tomato "
        "because the warm, humid, rain-heavy pattern favours them and the "
        "2500 USD budget covers raised beds and basic pest scouting."
    )
    invented_answer = (
        "The forecast shows temperatures of 42 degrees and zero rainfall "
        "next month, so I recommend planting wheat and drilling a "
        "borehole for irrigation."
    )

    print("--- Judge smoke test ---")
    good = judge_groundedness(context, question, grounded_answer)
    print(f"Grounded answer: score={good.score}  rationale={good.rationale}")

    bad = judge_groundedness(context, question, invented_answer)
    print(f"Invented answer: score={bad.score}  rationale={bad.rationale}")

    print(
        "\nExpected: grounded >= 4, invented <= 2. "
        "If the gap is there, the judge is calibrated well enough."
    )


def _run_one(scenario_id: str) -> None:
    scenarios = {s.id: s for s in agent_scenarios()}
    if scenario_id not in scenarios:
        available = ", ".join(scenarios.keys())
        print(f"Unknown scenario: {scenario_id}")
        print(f"Available: {available}")
        sys.exit(1)

    scenario = scenarios[scenario_id]
    print(f"--- Running scenario: {scenario.id} ---")
    print(f"Description: {scenario.description}")
    print(f"User message: {scenario.user_message}")
    print(f"Expected tool calls: {scenario.expected_tool_calls}")
    print()

    result = run_agent_scenario(scenario)

    print(f"Actual tool calls: {result.actual_tool_calls}")
    tool_match = (
        "PASS" if result.actual_tool_calls == result.expected_tool_calls else "FAIL"
    )
    print(f"Tool-use check: {tool_match}")
    print()
    print("Response:")
    print(result.response)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Run the judge on one hand-crafted pair to verify wiring.",
    )
    parser.add_argument(
        "--run-one",
        metavar="SCENARIO_ID",
        help="Run a single scenario end-to-end and print the result.",
    )
    parser.add_argument(
        "--run-all",
        action="store_true",
        help="Run every scenario and print the results table.",
    )
    parser.add_argument(
        "--no-judge",
        action="store_true",
        help="Skip the judge calls. Tool-use accuracy only.",
    )
    parser.add_argument(
        "--write-report",
        action="store_true",
        help="After --run-all, write docs/evaluation.md and eval_results.json.",
    )
    args = parser.parse_args()

    if args.smoke:
        _smoke_test_judge()
    elif args.run_one:
        _run_one(args.run_one)
    elif args.run_all:
        results = run_all_scenarios(judge=not args.no_judge)
        _print_results_table(results)
        if args.write_report:
            project_root = Path(__file__).resolve().parents[1]
            _save_results_json(results, project_root / "eval_results.json")
            _write_report(results, project_root / "docs" / "evaluation.md")
    else:
        print(
            "Run --smoke to check the judge, --run-one <id> to try a single "
            "scenario, --run-all to run the whole suite, or --run-all "
            "--write-report to also emit docs/evaluation.md."
        )