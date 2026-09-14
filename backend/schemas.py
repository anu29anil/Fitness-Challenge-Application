from pydantic import BaseModel, EmailStr, field_validator, model_validator
from datetime import datetime


# User Schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class UserResponse(BaseModel):
    id: int
    userId: str
    username: str
    email: str
    first_name: str
    last_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class ActivityCreate(BaseModel):
    activity_type: str
    value: float
    activity_date: datetime

    @field_validator("activity_type")
    @classmethod
    def valid_activity_type(cls, value: str) -> str:
        valid_types = {"running", "walking", "cycling", "swimming", "gym", "daily_steps"}
        if value not in valid_types:
            raise ValueError("Select a valid activity")
        return value

    @model_validator(mode="after")
    def valid_metric_value(self):
        maximums = {
            "running": 200, "walking": 100, "cycling": 500,
            "swimming": 1440, "gym": 1440, "daily_steps": 100000,
        }
        if not self.value > 0:
            raise ValueError("Value must be greater than 0")
        if self.value > maximums[self.activity_type]:
            raise ValueError(f"Value exceeds the maximum allowed for {self.activity_type.replace('_', ' ')}")
        if self.activity_type in {"swimming", "gym", "daily_steps"} and not self.value.is_integer():
            raise ValueError("Duration and daily steps must be whole numbers")
        return self


class ActivityResponse(BaseModel):
    id: int
    activity_type: str
    value: float
    points: int
    recorded_at: datetime


