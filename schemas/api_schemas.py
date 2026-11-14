from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExpenseStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class UserBase(BaseModel):
    email: str
    full_name: str


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class VehicleBase(BaseModel):
    plate_number: str
    model: str


class VehicleCreate(VehicleBase):
    pass


class VehicleRead(VehicleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ExpenseBase(BaseModel):
    user_id: int
    vehicle_id: int
    amount: float = Field(gt=0)
    category: str = Field(min_length=1)
    receipt_url: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    status: ExpenseStatus = ExpenseStatus.pending


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: ExpenseStatus
