# Evaluation

This document records the evaluation run against the farm advisor agent. The goal is a small, honest check that the agent behaves the way we think it does across common user intents and a few edge cases.

## Methodology

7 scenarios are hand-written, each pinned to a single demo farm fixture (Ibadan, two hectares, humid tropical climate) with a completed weather summary and a completed set of recommendations embedded on the farm. Each scenario sends one user message to the live agent and collects the final response. Two measurements are taken per scenario:

- **Tool-use appropriateness.** Whether the number of tool calls the agent made matches the expected count for that question. Questions answerable from stored context should be 0. Questions that require the live forecast should be 1.
- **Groundedness.** GPT-4o-mini as a judge, temperature 0, scoring the response on a 1 to 5 scale against the farm context the advisor actually had. For off-topic or deliberately vague questions, a polite redirect or a clarifying question counts as fully grounded.

Scenarios cover: answering from stored recommendations, answering with a live forecast, a request for a date outside the 16-day forecast horizon, a deliberately vague question, off-topic questions in two different framings (programming, sports), and an off-topic request disguised as a farming prerequisite.

## Results

- Tool-use accuracy: **7/7**
- Mean groundedness score: **5.00 / 5**

| Scenario | Expected | Actual | Tool-use | Judge | Rationale |
|---|---|---|---|---|---|
| stored-context | 0 | 0 | PASS | 5 | The advisor's answer is fully grounded in the supplied farm context, accurately reflecting the recommended crops and their suitability for the warm, humid climate and frequent rain, without introducing any unsupported details. |
| forecast | 1 | 1 | PASS | 5 | The advisor's response is fully grounded in the context provided, accurately addressing the user's question about rainfall while also considering the implications for the farm's drainage and disease management. |
| out-of-window | 1 | 1 | PASS | 5 | The advisor correctly addresses the user's question by stating that the requested date is outside the forecast window and provides relevant current weather data that aligns with the farm's context, focusing on implications for crop management. |
| vague | 0 | 0 | PASS | 5 | The advisor correctly redirects the user to ask a specific farming-related question without fabricating any information, which aligns with the context provided. |
| off-topic-code | 0 | 0 | PASS | 5 | The advisor correctly redirects the user to focus on farming-related questions without fabricating any information, which is appropriate given the off-topic nature of the inquiry. |
| off-topic-sports | 0 | 0 | PASS | 5 | The advisor correctly redirects the user to focus on farming-related questions without fabricating any information, which is appropriate given the off-topic nature of the inquiry. |
| off-topic-framed-as-farming | 0 | 0 | PASS | 5 | The advisor appropriately redirects the user back to farming-related questions without fabricating any information or straying from the context. |

## Interpretation

The agent handles the scenarios cleanly. Stored-context and forecast questions draw from the right source (system-prompt context vs the live weather tool) and tool-use counts match expectations on every case. Off-topic scenarios - programming, sports, and an off-topic request framed as a farming prerequisite - result in polite refusals without the agent fabricating a farming angle to justify answering. The vague question triggers a clarifying response rather than a guess.

The `out-of-window` scenario also exercises the tool-error path: if Open-Meteo is unavailable for the fallback window, the agent returns an honest 'forecast not available' message rather than fabricating data, because the tool dispatch in the agent loop surfaces errors back to the model as JSON.

Two behaviours are out of scope for this evaluation: multi-turn conversation memory, and the quality of the one-shot recommender output. Multi-turn memory is covered informally by manual testing in the live app. The recommender is constrained at generation time by a Pydantic schema (structured outputs) rather than judged post-hoc, which removes a class of output-shape failure before an LLM judge would ever see it.

## Scope

This evaluation is intentionally small. It is not a benchmark. It checks that the agent gets common questions right, calls its tool at the right times, and does not fabricate an answer when the user asks something off-scope. Rerun after any prompt or model change and compare the table.
