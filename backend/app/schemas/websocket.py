from typing import Any, Optional

from pydantic import BaseModel


class WSEvent(BaseModel):
    event: str
    data: dict[str, Any]
