from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from core.database import Base, engine, get_db
from models.domain import Expense, User, Vehicle
from schemas.api_schemas import ExpenseCreate, ExpenseRead, ExpenseStatus
from services.ai_extractor import ReceiptAIParser


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Zero-Click Expense & Fleet Management API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/expenses/extract")
async def extract_expense(receipt: UploadFile = File(...)):
    file_bytes = await receipt.read()
    parser = ReceiptAIParser()
    return await parser.extract_data_from_image(file_bytes)


@app.post(
    "/api/v1/expenses/",
    response_model=ExpenseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    if db.get(User, payload.user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")
    if db.get(Vehicle, payload.vehicle_id) is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    expense = Expense(
        user_id=payload.user_id,
        vehicle_id=payload.vehicle_id,
        amount=payload.amount,
        category=payload.category,
        receipt_url=payload.receipt_url,
        status=payload.status.value,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@app.get("/api/v1/expenses/", response_model=List[ExpenseRead])
def list_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[ExpenseStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(Expense)
    if status_filter is not None:
        query = query.filter(Expense.status == status_filter.value)
    return query.order_by(Expense.id).offset(skip).limit(limit).all()


@app.get("/api/v1/expenses/{expense_id}", response_model=ExpenseRead)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense
