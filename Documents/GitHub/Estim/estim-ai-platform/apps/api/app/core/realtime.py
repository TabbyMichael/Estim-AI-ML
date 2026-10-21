"""Real-time infrastructure (Roadmap 1.2): WebSocket server + rooms.

Provides ConnectionManager with JWT-authenticated connections, channel
(pub/sub room) subscriptions, broadcast fan-out and heartbeat so the
frontend socket client can detect disconnects and reconnect.
"""

import asyncio
import logging
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.core.security import decode_token

logger = logging.getLogger("estim.realtime")

# Message types understood by the frontend socket client
MSG_CONNECTED = "connected"
MSG_PING = "ping"
MSG_PONG = "pong"
MSG_SUBSCRIBE = "subscribe"
MSG_UNSUBSCRIBE = "unsubscribe"
MSG_EVENT = "event"
MSG_ERROR = "error"


class WebSocketAuthError(Exception):
    """Raised when a WebSocket connection fails authentication."""


def authenticate_websocket(token: str | None) -> dict[str, Any]:
    """Validate a JWT access token for a WebSocket handshake."""
    if not token:
        raise WebSocketAuthError("Missing token.")
    payload = decode_token(token)
    if payload.get("type") != "access" or not payload.get("sub"):
        raise WebSocketAuthError("Invalid access token.")
    return payload


class ConnectionManager:
    """Tracks live WebSocket connections, rooms and broadcast routing."""

    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}
        self._rooms: dict[str, set[str]] = defaultdict(set)
        self._user_rooms: dict[str, set[str]] = defaultdict(set)
        self._lock = asyncio.Lock()

    @property
    def connection_count(self) -> int:
        return len(self._connections)

    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[connection_id] = websocket
            # Personal room: every user listens on user:{id}
            self._rooms[f"user:{user_id}"].add(connection_id)
            self._user_rooms[user_id].add(connection_id)
        await self.send_to(
            connection_id,
            {
                "type": MSG_CONNECTED,
                "connection_id": connection_id,
                "user_id": user_id,
                "server_time": datetime.now(UTC).isoformat(),
            },
        )
        logger.info("ws connected user=%s conn=%s", user_id, connection_id)

    async def disconnect(self, connection_id: str) -> None:
        async with self._lock:
            self._connections.pop(connection_id, None)
            for members in self._rooms.values():
                members.discard(connection_id)
            for members in self._user_rooms.values():
                members.discard(connection_id)
        logger.info("ws disconnected conn=%s", connection_id)

    async def subscribe(self, connection_id: str, channel: str) -> None:
        async with self._lock:
            self._rooms[channel].add(connection_id)

    async def unsubscribe(self, connection_id: str, channel: str) -> None:
        async with self._lock:
            self._rooms[channel].discard(connection_id)

    async def send_to(self, connection_id: str, payload: dict[str, Any]) -> bool:
        ws = self._connections.get(connection_id)
        if ws is None:
            return False
        try:
            await ws.send_json(payload)
            return True
        except (WebSocketDisconnect, RuntimeError):
            await self.disconnect(connection_id)
            return False

    async def broadcast(self, payload: dict[str, Any], channel: str | None = None) -> int:
        """Fan a payload to a channel (or all connections when channel=None)."""
        async with self._lock:
            targets = (
                set(self._connections) if channel is None else set(self._rooms.get(channel, set()))
            )
        delivered = 0
        for connection_id in list(targets):
            if await self.send_to(connection_id, payload):
                delivered += 1
        return delivered

    async def notify_user(self, user_id: str, payload: dict[str, Any]) -> int:
        """Deliver an event to every connection belonging to one user."""
        return await self.broadcast(payload, channel=f"user:{user_id}")

    def channels(self) -> dict[str, int]:
        return {name: len(members) for name, members in self._rooms.items()}


manager = ConnectionManager()

# Main event loop captured at startup so *sync* service code (routes,
# notification dispatch running in the threadpool) can publish safely.
_main_loop: "asyncio.AbstractEventLoop | None" = None


def capture_loop() -> None:
    """Record the running event loop (called from FastAPI startup)."""
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except RuntimeError:
        _main_loop = None


def publish(user_id: str, payload: dict[str, Any]) -> bool:
    """Thread-safe fire-and-forget push to one user's connections."""
    loop = _main_loop
    if loop is None or loop.is_closed():
        return False
    loop.call_soon_threadsafe(lambda: asyncio.ensure_future(manager.notify_user(user_id, payload)))
    return True


async def websocket_endpoint(websocket: WebSocket, token: str | None = None) -> None:
    """Root WebSocket endpoint: auth -> heartbeat -> message loop."""
    connection_id = f"conn-{id(websocket)}"
    try:
        payload = authenticate_websocket(token or websocket.query_params.get("token"))
    except Exception:  # noqa: BLE001 - close with policy code 4401
        await websocket.close(code=4401, reason="Unauthorized")
        return
    user_id = str(payload["sub"])
    await manager.connect(websocket, user_id, connection_id)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == MSG_PING:
                await manager.send_to(connection_id, {"type": MSG_PONG})
            elif msg_type == MSG_SUBSCRIBE:
                channel = str(data.get("channel", "")).strip()
                if channel:
                    await manager.subscribe(connection_id, channel)
                    await manager.send_to(connection_id, {"type": "subscribed", "channel": channel})
            elif msg_type == MSG_UNSUBSCRIBE:
                channel = str(data.get("channel", "")).strip()
                if channel:
                    await manager.unsubscribe(connection_id, channel)
                    await manager.send_to(
                        connection_id, {"type": "unsubscribed", "channel": channel}
                    )
            else:
                await manager.send_to(
                    connection_id,
                    {"type": MSG_ERROR, "detail": f"Unknown message type: {msg_type}"},
                )
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001 - resilience: never leak loop
        logger.warning("ws error conn=%s: %s", connection_id, exc)
    finally:
        await manager.disconnect(connection_id)
