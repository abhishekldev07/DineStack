from pydantic import BaseModel
from typing import Optional


class MenuCreate(BaseModel):
    name: str
    category: str
    description: str
    price: float
    image_url: Optional[str] = None
    available: bool = True


class MenuAvailabilityUpdate(BaseModel):
    available: bool