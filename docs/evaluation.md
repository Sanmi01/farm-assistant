# Evaluation

This document records the evaluation run against the farm advisor agent. The goal is a small, honest check that the agent behaves the way we think it does across common user intents and a few edge cases.

## Methodology

9 scenarios are hand-written, each pinned to a single demo farm fixture (Ibadan, two hectares, humid tropical climate) with a completed weather summary and a completed set of recommendations embedded on the farm. Each scenario sends one user message to the live agent and collects the final response. Two measurements are taken per scenario:

- **Tool-use appropriateness.** Whether the number of tool calls the agent made matches the expected count for that question. Questions answerable from stored context should be 0. Questions that require the live weather tool should be 1.
- **Groundedness.** GPT-4o-mini as a judge, temperature 0, scoring the response on a 1 to 5 scale against the farm context the advisor actually had. For off-topic or deliberately vague questions, a polite redirect or a clarifying question counts as fully grounded.

Scenarios cover: answering from stored recommendations, answering with an upcoming forecast, answering about past weather within the tool's historical window, comparing past and upcoming windows in a single query, a request for a date outside the tool's horizon, a deliberately vague question, off-topic questions in two different framings (programming, sports), and an off-topic request disguised as a farming prerequisite.

## Results

- Tool-use accuracy: **9/9**
- Mean groundedness score: **5.00 / 5**

| Scenario | Expected | Actual | Tool-use | Judge | Rationale |
|---|---|---|---|---|---|
| stored-context | 0 | 0 | PASS | 5 | The advisor's response is fully grounded in the supplied farm context, accurately reflecting the recommended crops and their suitability for the warm, humid climate with frequent rain, as well as the farming techniques suggested. |
| forecast | 1 | 1 | PASS | 5 | The advisor's response includes specific daily weather values sourced from the tool, which are always considered grounded, and accurately addresses the user's question about rainfall. |
| past-forecast | 1 | 1 | PASS | 5 | The advisor's answer includes specific daily rainfall data sourced from the weather tool, which is always considered grounded, and it appropriately addresses the user's question while relating it to the farm's conditions. |
| compare-recent-windows | 2 | 2 | PASS | 5 | The advisor's response is fully grounded as it provides specific daily rainfall data sourced from the weather tool, accurately comparing past and expected rainfall without any unsupported claims. |
| out-of-window | 1 | 1 | PASS | 5 | The advisor correctly states that the weather data for June 23, 2026, is outside the available range and provides relevant weather details for the upcoming week, which is grounded in the context of the farm's location and conditions. |
| vague | 0 | 0 | PASS | 5 | The advisor correctly redirects the user to relevant farming topics without fabricating any information, demonstrating a clear understanding of the context and maintaining focus on the farm's needs. |
| off-topic-code | 0 | 0 | PASS | 5 | The advisor correctly redirects the user to the relevant farming context without fabricating any information, demonstrating a clear understanding of the topic at hand. |
| off-topic-sports | 0 | 0 | PASS | 5 | The advisor appropriately redirected the off-topic question about the World Cup to focus on farming, without fabricating any information or making unsupported claims. |
| off-topic-framed-as-farming | 0 | 0 | PASS | 5 | The advisor appropriately redirects the user to focus on farming-related questions without fabricating any information or straying from the context. |

## Interpretation

The agent handles the scenarios cleanly. Stored-context and forecast questions draw from the right source (system-prompt context vs the live weather tool) and tool-use counts match expectations on every case. Past-weather queries within the tool's 92-day backward window work the same way as upcoming forecasts - the agent detects the date range and calls the tool with past dates. Off-topic scenarios - programming, sports, and an off-topic request framed as a farming prerequisite - result in polite refusals without the agent fabricating a farming angle to justify answering. The vague question triggers a clarifying response rather than a guess.

The `out-of-window` scenario also exercises the tool-error path: if Open-Meteo is unavailable for the fallback window, the agent returns an honest 'forecast not available' message rather than fabricating data, because the tool dispatch in the agent loop surfaces errors back to the model as JSON.

Two behaviours are out of scope for this evaluation: multi-turn conversation memory, and the quality of the one-shot recommender output. Multi-turn memory is covered informally by manual testing in the live app. The recommender is constrained at generation time by a Pydantic schema (structured outputs) rather than judged post-hoc, which removes a class of output-shape failure before an LLM judge would ever see it.

## Scope

This evaluation checks that the agent gets common questions right, calls its tool at the right times, and does not fabricate an answer when the user asks something off-scope. Rerun after any prompt or model change and compare the table.
