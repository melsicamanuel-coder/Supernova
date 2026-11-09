import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, project_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[project_id].append(websocket)
        logger.info("WebSocket connected for project %s", project_id)

    def disconnect(self, project_id: str, websocket: WebSocket) -> None:
        self._connections[project_id] = [
            ws for ws in self._connections[project_id] if ws is not websocket
        ]
        logger.info("WebSocket disconnected for project %s", project_id)

    async def broadcast(self, project_id: str, data: dict[str, Any]) -> None:
        message = json.dumps(data)
        dead: list[WebSocket] = []
        for ws in self._connections.get(project_id, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(project_id, ws)


ws_manager = WebSocketManager()
