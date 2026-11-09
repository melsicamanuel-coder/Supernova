from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import ws_manager

router = APIRouter()


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await ws_manager.connect(project_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(project_id, websocket)
