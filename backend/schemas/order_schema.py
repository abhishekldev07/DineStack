from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from typing import List, Optional

from typing import Literal


def _normalize_address(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    normalized_value = value.strip()
    return normalized_value or None


def _validate_phone_number(value: str) -> str:
    normalized_value = (value or "").strip()

    if not normalized_value:
        raise ValueError("Phone number is required")

    if not normalized_value.isdigit():
        raise ValueError("Phone number must contain only numbers")

    if len(normalized_value) != 10:
        raise ValueError("Phone number must be exactly 10 digits")

    if not normalized_value.startswith(("98", "97")):
        raise ValueError("Phone number must start with 98 or 97")

    return normalized_value


def _validate_delivery_address(value: Optional[str]) -> Optional[str]:
    normalized_value = _normalize_address(value)

    if normalized_value is None:
        return None

    if len(normalized_value) < 10:
        raise ValueError("Delivery address must be at least 10 characters")

    letters_count = sum(character.isalpha() for character in normalized_value)
    digits_count = sum(character.isdigit() for character in normalized_value)

    if letters_count < 3 or (letters_count == 0 and digits_count == 0):
        raise ValueError("Delivery address must include meaningful text")

    return normalized_value

class OrderItemCreate(BaseModel):

    menu_item_id: int
    quantity: int


class OrderCreate(BaseModel):

    items: List[OrderItemCreate]

    phone_number: str

    delivery_address: Optional[str] = None

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value):
        return _validate_phone_number(value)

    @field_validator("delivery_address")
    @classmethod
    def normalize_delivery_address(cls, value):
        return _normalize_address(value)

    @model_validator(mode="after")
    def validate_delivery_location(self):
        has_coordinates = self.latitude is not None and self.longitude is not None

        if not has_coordinates:
            validated_address = _validate_delivery_address(self.delivery_address)

            if validated_address is None:
                raise ValueError(
                    "Delivery address is required when GPS location is not used"
                )

            self.delivery_address = validated_address

        return self


class OrderStatusUpdate(BaseModel):

    status: Literal[
        "pending",
        "preparing",
        "delivered",
        "cancelled"
    ]

class OrderEditItem(BaseModel):

    menu_item_id: int
    quantity: int


class OrderEdit(BaseModel):

    items: list[OrderEditItem]


class OrderItemResponse(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    menu_item_id: int
    name: str
    quantity: int
    price: float
    subtotal: float


class OrderResponse(BaseModel):

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    order_id: int
    user_id: Optional[int] = None
    status: str
    total_price: float
    created_at: datetime
    phone_number: Optional[str] = None
    delivery_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    payment_id: Optional[int] = None
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    items: List[OrderItemResponse]