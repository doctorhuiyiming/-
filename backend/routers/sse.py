import asyncio
import logging

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from services.sse_manager import sse_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["sse"])


@router.get("/sse/{project_id}")
async def sse_endpoint(project_id: str):
    """
    SSE endpoint that streams real-time events for a given project.
    Clients subscribe and receive events such as:
      - parsing_complete
      - generation_started
      - slice_completed
      - slice_failed
      - project_status_changed
    """
    queue = await sse_manager.subscribe(project_id)
    logger.info(f"[sse] client connected for project={project_id}")

    async def event_generator():
        try:
            # Send an initial connection confirmation
            yield {
                "event": "connected",
                "data": f'{{"project_id": "{project_id}", "message": "SSE connection established"}}',
            }

            while True:
                try:
                    # Wait for new events (with timeout to send keepalive pings)
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield event
                except asyncio.TimeoutError:
                    # Send a keepalive comment to prevent connection drop
                    yield {"event": "ping", "data": "{}"}
        except asyncio.CancelledError:
            logger.info(f"[sse] client disconnected for project={project_id}")
        finally:
            await sse_manager.unsubscribe(project_id, queue)

    return EventSourceResponse(event_generator())
