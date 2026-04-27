# Farm Assistant

A full-stack AI farm advisor. Sign in, register a farm by location and budget, and chat with an agricultural advisor grounded in your farm's profile, a 16-day weather analysis, and AI-generated recommendations. The chat agent uses tool-calling to fetch live weather for any date in the past 92 days through 15 days ahead.

## What it does

A farmer signs in via Clerk, creates a farm through a four-step wizard (name, coordinates, land size, budget). On creation, a background pipeline runs two stages: it pulls 16 days of forecast data from Open-Meteo and aggregates it into a structured weather summary, then feeds that into GPT-4o-mini using structured outputs to produce crop suggestions, techniques, services, and a narrative report.

Once both analyses complete, a chat interface opens. The agent has one tool, `get_weather_forecast`, covering 92 days backward through 15 days forward. Per-turn it decides whether stored context is sufficient or whether to call the tool. Responses stream over Server-Sent Events.

## Tech stack

Backend is Python 3.12 on AWS Lambda. FastAPI, Pydantic v2, Mangum, structlog, OpenAI SDK, fastapi-clerk-auth, httpx.

Frontend is Next.js 15 (Pages Router), TypeScript, Tailwind. Clerk pinned to `@clerk/nextjs@6.39.0`. Static export hosted on S3.

Storage is DynamoDB. Two pay-per-request tables: `farm-dev-farms` partitioned by `user_id`, and `farm-dev-chat` with a composite sort key `<iso_timestamp>#<message_id>` for native chronological reads.

Infrastructure is Terraform with S3 backend and DynamoDB state locking. CI/CD is GitHub Actions with OIDC federation. CloudFront fronts both the static frontend and the API Gateway HTTP API, with a single CloudFront Function handling `/api/*` prefix stripping and Next.js dynamic-route rewrites at the edge.

External services: OpenAI (`gpt-4o-mini`), Open-Meteo, Clerk.

## Architecture

```
                     ┌────────────────────────────┐
                     │       CloudFront           │
                     │   (single distribution)    │
                     │                            │
                     │  ┌──────────────────────┐  │
                     │  │ CloudFront Function  │  │
                     │  │  - strips /api       │  │
                     │  │  - rewrites Next.js  │  │
                     │  │    dynamic routes    │  │
                     │  └──────────────────────┘  │
                     └──────┬──────────────┬──────┘
                            │              │
              default       │              │   /api/*
              behavior      │              │   behavior
                            ▼              ▼
                  ┌──────────────┐   ┌──────────────────┐
                  │  S3 bucket   │   │  API Gateway     │
                  │  (Next.js    │   │  HTTP API        │
                  │   static     │   │                  │
                  │   export)    │   │                  │
                  └──────────────┘   └────────┬─────────┘
                                              │
                                              ▼
                                  ┌────────────────────────┐
                                  │   AWS Lambda           │
                                  │   (FastAPI + Mangum)   │
                                  └─┬──────┬──────┬────────┘
                                    │      │      │
                                    ▼      ▼      ▼
                  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
                  │  DynamoDB    │ │  OpenAI API  │ │  Open-Meteo  │
                  └──────────────┘ └──────────────┘ └──────────────┘
```

A single CloudFront distribution has two origins: S3 for the static frontend and API Gateway for the Lambda. Path-based behaviors route `/api/*` to API Gateway and everything else to S3. A single CloudFront Function runs at the edge on both behaviors, stripping `/api` for backend requests and rewriting Next.js dynamic routes (`/farms/<id>` to `/farms/[id]/index.html`) for frontend requests.

This keeps browser requests same-origin (no CORS preflight), keeps backend routes identical across environments, and handles SPA refresh on dynamic routes. The Lambda and S3 buckets are private; CloudFront is the only public entry point.

## Key features

Clerk authentication with JWT verification on every API request, scoped to the authenticated user via partition key.

Multi-step wizard with per-step validation, coordinate range checks, and a "Use my current location" geolocation option.

Background analysis pipeline with idempotent stages and a status machine (`pending` to `processing` to `completed | failed`). Frontend polls every 5 seconds with terminal-state exit and a 5-minute hard cap.

Structured AI recommendations via `openai.beta.chat.completions.parse` with Pydantic constraints (3 to 5 crops, techniques, and services; 200-character minimum on the report).

Tool-calling chat with one weather tool covering 92 days backward through 15 days forward. Out-of-window requests are clamped and the tool returns a `note` so the agent can explain.

Streaming SSE chat responses with abort and retry. Markdown rendering on assistant messages.

LLM-as-judge evaluation harness with 9 hand-written scenarios. Reproducibly hits 9/9 tool-use accuracy and 5.00/5 mean groundedness.

## How it works

### Authentication

Clerk runs client-side. The frontend calls `getToken()` to fetch a fresh JWT and attaches it as `Authorization: Bearer <jwt>`. The backend's `ClerkHTTPBearer` dependency verifies the signature against Clerk's JWKS endpoint and exposes the `sub` claim as `user_id` via dependency injection. JWKS keys are cached, so verification is cryptographic with no per-request round trip to Clerk.

### Farm creation pipeline

The route handler writes the new record with both stage statuses set to `pending` and schedules `pipeline.run_full_pipeline` via FastAPI's `BackgroundTasks`. The handler returns immediately.

The weather stage calls Open-Meteo for 16 days of daily data and aggregates: `average_temperature` is the mean of `(max + min) / 2` per day, `total_precipitation` is the sum, plus a derived `seasonal_pattern` string from a first-week-vs-last-week comparison. Pure deterministic Python; no LLM.

Once weather completes, the recommendations stage runs `beta.chat.completions.parse` with a `RecommendationSchema` Pydantic model. If output doesn't conform, `parsed is None` and the recommender raises `ExternalServiceError`. Both stages are idempotent and check their own status before running.

### Agentic chat with tool calling

The system prompt is reassembled fresh on each turn from the current farm state. The user message is appended to the chat table; the last 20 messages are loaded as history.

For up to four iterations, a non-streaming call is made with `tool_choice="auto"`. If the model wants a tool call, the backend parses arguments, executes the tool, catches exceptions and serializes them as `{"error": "..."}` to feed back, and continues. Otherwise the backend issues a streaming call with `tool_choice="none"` for the final answer.

Only the user message and final assistant answer are persisted. Intermediate tool turns are per-turn working memory. The `get_weather_forecast` tool clamps out-of-window date requests and surfaces a `note` field explaining the clamp.

### Real-time analysis status

The `useAnalysisStatus` hook polls every 5 seconds, exits when both stages reach a terminal state, and hard-caps at 5 minutes. An `isMountedRef` guards against React strict-mode double-mount and stale state updates after unmount. Cards render four states: skeleton, data, error, and a retry button.

## Project structure

```
farm_assistant/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, middleware
│   │   ├── middleware.py           # request_id middleware
│   │   ├── config.py               # pydantic-settings, fail-fast
│   │   ├── auth.py                 # Clerk JWT verification
│   │   ├── errors.py               # AppError hierarchy
│   │   ├── logging.py              # structlog config
│   │   ├── schemas.py              # all Pydantic models
│   │   ├── routes/                 # farms, chat, health
│   │   └── services/               # agent, weather, recommender, pipeline, repos
│   ├── lambda_handler.py           # Mangum entrypoint
│   └── requirements.txt
├── frontend/
│   ├── pages/                      # _app, index, farms/{index,new,[id]}
│   ├── components/                 # wizard/, ui/, ChatPanel, WeatherCard, ...
│   ├── hooks/                      # useFormSteps, useAnalysisStatus
│   ├── lib/                        # api.ts, types.ts
│   └── styles/globals.css          # OKLCH design tokens
├── terraform/
│   ├── main.tf                     # all AWS resources
│   ├── backend.tf                  # S3 backend
│   └── secrets.auto.tfvars         # gitignored
├── scripts/
│   ├── bootstrap_shared.sh
│   ├── build-lambda.sh
│   ├── create_local_table.py
│   └── evaluate.py
├── .github/workflows/              # deploy.yml, destroy.yml
├── docs/evaluation.md              # auto-generated
└── docker-compose.yml              # DynamoDB Local
```

## Local development

### Prerequisites

Python 3.12, Node.js 20+, Docker Desktop, Git Bash if on Windows, accounts at OpenAI and Clerk.

### Setup

```bash
cd farm_assistant
python -m venv .venv
source .venv/Scripts/activate    # Git Bash on Windows
# or: source .venv/bin/activate  # macOS/Linux
pip install -r backend/requirements.txt
cp .env.example .env              # then fill in your keys
```

The `.env` at project root needs `OPENAI_API_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `FARMS_TABLE_NAME=farm-dev-farms`, `CHAT_TABLE_NAME=farm-dev-chat`, `DYNAMODB_ENDPOINT_URL=http://localhost:8002`.

For the frontend, create `frontend/.env.local` with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.

### Running the backend

```bash
docker-compose up                    # DynamoDB Local on :8002
python scripts/create_local_table.py # tables vanish on restart (-inMemory)
cd backend && uvicorn app.main:app --reload --port 8000
```

Swagger UI at `http://localhost:8000/docs`.

### Running the frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server at `http://localhost:3000`.

### Running the eval harness

```bash
python scripts/evaluate.py --smoke           # one-call sanity check
python scripts/evaluate.py --run-all         # full suite
python scripts/evaluate.py --run-all --write-report   # also writes docs/evaluation.md
```

## Deployment

### Infrastructure

All AWS resources live in `terraform/main.tf`: Lambda, API Gateway HTTP API, S3 buckets, CloudFront with two origins and the routing function, DynamoDB tables, IAM roles, CloudWatch log groups with 30-day retention.

The Lambda zip is built by `scripts/build-lambda.sh` running pip inside `public.ecr.aws/lambda/python:3.12` for Linux-compatible wheels. The zip is uploaded to S3 and referenced by the Lambda via `s3_bucket`/`s3_key` to avoid `InvalidSignatureException` errors on inline upload.

The Terraform state backend is bootstrapped separately by `scripts/bootstrap_shared.sh` and persists across environment teardowns.

### CI/CD

GitHub Actions deploys via OIDC federation. A dedicated IAM role has a trust policy scoped to this repo via the OIDC token's `sub` claim. No long-lived AWS keys in GitHub secrets.

`deploy.yml` triggers on push to `main`. It runs build, Terraform apply, frontend export, two-pass S3 sync (immutable cache for hashed assets, no-cache for HTML/JSON), and CloudFront invalidation.

`destroy.yml` is `workflow_dispatch` only and requires typed environment confirmation.

## Observability

Three correlated layers.

**OpenAI dashboard** at `platform.openai.com/logs` shows every OpenAI call. Each call is tagged with metadata: `purpose` (`agent_detect`, `agent_stream`, `recommender`, `judge`) and `farm_id` where applicable. `store=True` is set so calls persist to the dashboard.

**CloudWatch Logs** at `/aws/lambda/farm-dev-api` carry every backend log line. structlog emits JSON with event names like `pipeline_started`, `tool_call_executed`, `chat_turn_complete`. A FastAPI middleware generates a UUID `request_id` per request and binds it to structlog contextvars so every log line within that request inherits it. Also surfaced as an `X-Request-ID` response header.

**API Gateway access logs** at `/aws/apigateway/farm-dev-access` capture one structured JSON line per HTTP request with method, path, status, latency, source IP, and request ID.

Cross-system correlation: every chat turn produces one API Gateway access log entry, multiple Lambda log lines sharing a `request_id`, and 2-4 OpenAI dashboard entries sharing the matching `farm_id`.

## Evaluation

`scripts/evaluate.py` runs 9 hand-written scenarios against the live agent, pinned to a single demo farm fixture (Ibadan, two hectares, humid tropical). Each scenario measures tool-use appropriateness (expected vs actual tool calls) and groundedness (1 to 5 from GPT-4o-mini at temperature 0 with structured output).

Scenarios cover stored-context, forecast, past-weather within the 92-day backward window, multi-window comparison, out-of-window clamping, vague queries, and three off-topic categories.

Latest run: 9/9 tool-use accuracy, 5.00/5 mean groundedness. Reproducible across consecutive runs. Full results in `docs/evaluation.md`, auto-generated.

## Design decisions and trade-offs

**Tool-calling over RAG for chat.** Farm context fits in the prompt window; the dynamic question is temporal weather data, which is a tool problem not a retrieval problem. RAG would have introduced a vector store, embeddings pipeline, and retrieval evaluation for no benefit.

**Two-phase agent turn over inline streaming with tool-call deltas.** Non-streaming detect call, then streaming answer with `tool_choice="none"`. Adds about 200ms on answer-only turns; dramatically simplifies implementation.

**Eager `BackgroundTasks` over event-driven analysis.** Keeps everything in one Lambda. EventBridge-driven two-Lambda is the documented migration path for production scale.

**Single CloudFront with a routing Function over separate URLs.** Browser requests stay same-origin (no CORS preflight). Backend routes are identical across local, direct API Gateway, and production.

**Structured outputs over regex prose parsing.** Every structured LLM call uses `beta.chat.completions.parse` with a Pydantic schema. No regex parsing of model output anywhere.

**SSE over WebSockets for chat.** Chat is unidirectional during generation. The frontend uses `fetch` and `ReadableStream` rather than `EventSource` because chat requires a POST body.

