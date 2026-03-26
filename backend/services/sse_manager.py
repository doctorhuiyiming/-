import asyncio
import json
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class SSEManager:
    def __init__(self):
        self.connections: Dict[str, List[asyncio.Queue]] = {}

    async def subscribe(self, project_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        if project_id not in self.connections:
            self.connections[project_id] = []
        self.connections[project_id].append(queue)
        logger.info(f"SSE subscribe: project={project_id}, total={len(self.connections[project_id])}")
        return queue

    async def unsubscribe(self, project_id: str, queue: asyncio.Queue):
        if project_id in self.connections:
            try:
                self.connections[project_id].remove(queue)
                logger.info(f"SSE unsubscribe: project={project_id}, remaining={len(self.connections[project_id])}")
            except ValueError:
                pass
            if not self.connections[project_id]:
                del self.connections[project_id]

    async def publish(self, project_id: str, event_type: str, data: dict):
        if project_id not in self.connections:
            logger.debug(f"SSE publish: no subscribers for project={project_id}")
            return

        payload = json.dumps({"event_type": event_type, "project_id": project_id, "data": data})
        queues = list(self.connections[project_id])
        logger.info(f"SSE publish: project={project_id}, event={event_type}, subscribers={len(queues)}")

        for queue in queues:
            try:
                await queue.put({"event": event_type, "data": payload})
            except Exception as e:
                logger.error(f"SSE publish error: {e}")


sse_manager = SSEManager()
