from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.orm import mapped_column

from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = mapped_column(Integer, primary_key=True, index=True)
    email = mapped_column(String, unique=True, nullable=False, index=True)
    full_name = mapped_column(String, nullable=False)

    expenses = relationship("Expense", back_populates="user")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = mapped_column(Integer, primary_key=True, index=True)
    plate_number = mapped_column(String, unique=True, nullable=False, index=True)
    model = mapped_column(String, nullable=False)

    expenses = relationship("Expense", back_populates="vehicle")


class Expense(Base):
    __tablename__ = "expenses"

    id = mapped_column(Integer, primary_key=True, index=True)
    user_id = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = mapped_column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    amount = mapped_column(Float, nullable=False)
    category = mapped_column(String, nullable=False)
    receipt_url = mapped_column(String, nullable=True)
    status = mapped_column(String, nullable=False, default="pending", index=True)

    user = relationship("User", back_populates="expenses")
    vehicle = relationship("Vehicle", back_populates="expenses")
