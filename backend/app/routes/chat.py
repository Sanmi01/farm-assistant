#  Chat endpoint for a farm

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..auth import get_current_user_id
from ..errors import AppError
from ..logging import get_logger
from ..schemas import ChatHistoryResponse, ChatRequest
from ..services import chat_repo, farms_repo
from ..services.agent import stream_chat_response

logger = get_logger(__name__)

router = APIRouter(prefix="/farms/{farm_id}/chat", tags=["chat"])


def _sse_line(data: str) -> str:
    safe = data.replace("\r", "").replace("\n", "\\n")
    return f"data: {safe}\n\n"


@router.post("")
def chat(
    farm_id: str,
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id),
) -> StreamingResponse:
    farms_repo.get_farm(user_id, farm_id)

    def event_stream():
        try:
            for token in stream_chat_response(user_id, farm_id, request.message):
                yield _sse_line(token)
            yield "data: [DONE]\n\n"
        except AppError as exc:
            logger.warning("chat_stream_app_error", code=exc.error_code, message=exc.message)
            yield _sse_line(f"[ERROR] {exc.message}")
            yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.error("chat_stream_unexpected", error=str(exc))
            yield _sse_line("[ERROR] Something went wrong. Please try again.")
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("", response_model=ChatHistoryResponse)
def history(
    farm_id: str,
    user_id: str = Depends(get_current_user_id),
) -> ChatHistoryResponse:
    farms_repo.get_farm(user_id, farm_id)
    messages = chat_repo.list_messages(farm_id, limit=50)
    return ChatHistoryResponse(farm_id=farm_id, messages=messages)