import logging
from contextlib import asynccontextmanager
from typing import Callable, TypeVar

from fastapi import Depends, FastAPI, HTTPException, Path, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app import crud
from app.database import FRONTEND_ORIGIN, engine, get_db, initialize_database, mysql_connection_error
from app.models import FinancialReportRecord, utc_now
from app.schemas import (
    FiscalPeriodRead,
    FiscalPeriodWrite,
    FinancialReportRead,
    FinancialReportWrite,
)

logger = logging.getLogger("stackly.fico")
T = TypeVar("T")


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        initialize_database()
    except RuntimeError:
        logger.exception("MySQL startup check failed.")
        raise
    yield


app = FastAPI(
    title="STACKLY OneERP FICO API",
    description="MySQL-backed Fiscal Period and Financial Reports APIs.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"])),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_, exc: SQLAlchemyError):
    logger.error("Database request failed (%s).", type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "The database request failed. Check the MySQL connection and try again."},
    )


@app.get("/")
def root():
    return {"message": "STACKLY OneERP FICO API is running"}


@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
        return {"status": "ok", "database": "MySQL", "database_name": "fico_module_db"}
    except SQLAlchemyError as exc:
        logger.error("MySQL health check failed (%s).", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=mysql_connection_error(exc),
        ) from exc


def _commit_or_conflict(db: Session, operation: Callable[[], T]) -> T:
    try:
        return operation()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A database constraint rejected the request. Check for a duplicate Fiscal Period number.",
        ) from exc
    except SQLAlchemyError:
        db.rollback()
        raise


@app.get("/fiscal-periods", response_model=list[FiscalPeriodRead])
def get_fiscal_periods(
    fiscal_year: str | None = Query(default=None),
    period_status: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    records = crud.list_fiscal_periods(db)
    if fiscal_year:
        records = [record for record in records if record.fiscal_year == fiscal_year]
    if period_status:
        records = [record for record in records if record.status == period_status]
    return records


@app.get("/fiscal-period/{period_id}", response_model=FiscalPeriodRead)
def get_fiscal_period(period_id: int = Path(gt=0), db: Session = Depends(get_db)):
    record = crud.get_fiscal_period(db, period_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiscal Period not found.")
    return record


@app.post("/fiscal-period", response_model=FiscalPeriodRead, status_code=status.HTTP_201_CREATED)
def create_fiscal_period(payload: FiscalPeriodWrite, db: Session = Depends(get_db)):
    return _commit_or_conflict(db, lambda: crud.create_fiscal_period(db, payload))


@app.put("/fiscal-period/{period_id}", response_model=FiscalPeriodRead)
def update_fiscal_period(
    payload: FiscalPeriodWrite,
    period_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    record = crud.get_fiscal_period(db, period_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiscal Period not found.")
    return _commit_or_conflict(db, lambda: crud.update_fiscal_period(db, record, payload))


@app.delete("/fiscal-period/{period_id}")
def delete_fiscal_period(period_id: int = Path(gt=0), db: Session = Depends(get_db)):
    record = crud.get_fiscal_period(db, period_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiscal Period not found.")
    _commit_or_conflict(db, lambda: crud.delete_fiscal_period(db, record))
    return {"message": "Fiscal Period deleted successfully.", "id": period_id}


@app.get("/financial-reports", response_model=list[FinancialReportRead])
def get_financial_reports(db: Session = Depends(get_db)):
    return crud.list_financial_reports(db)


@app.get("/financial-report/{report_id}", response_model=FinancialReportRead)
def get_financial_report(report_id: int = Path(gt=0), db: Session = Depends(get_db)):
    record = crud.get_financial_report(db, report_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial Report not found.")
    return record


@app.post("/financial-report", response_model=FinancialReportRead, status_code=status.HTTP_201_CREATED)
def create_financial_report(payload: FinancialReportWrite, db: Session = Depends(get_db)):
    return _commit_or_conflict(db, lambda: crud.create_financial_report(db, payload, generated=False))


@app.post("/financial-report/generate", response_model=FinancialReportRead, status_code=status.HTTP_201_CREATED)
def generate_financial_report(payload: FinancialReportWrite, db: Session = Depends(get_db)):
    return _commit_or_conflict(db, lambda: crud.create_financial_report(db, payload, generated=True))


@app.put("/financial-report/{report_id}", response_model=FinancialReportRead)
def update_financial_report(
    payload: FinancialReportWrite,
    report_id: int = Path(gt=0),
    db: Session = Depends(get_db),
):
    record = crud.get_financial_report(db, report_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial Report not found.")
    return _commit_or_conflict(db, lambda: _update_financial_report(db, record, payload))


def _update_financial_report(db: Session, record: FinancialReportRecord, payload: FinancialReportWrite):
    for field, value in payload.model_dump(mode="python").items():
        setattr(record, field, value)
    record.report_data = crud.sample_report_data(payload.report_type)
    record.status = "Completed"
    record.generated_at = utc_now()
    db.commit()
    db.refresh(record)
    return record


@app.delete("/financial-report/{report_id}")
def delete_financial_report(report_id: int = Path(gt=0), db: Session = Depends(get_db)):
    record = crud.get_financial_report(db, report_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial Report not found.")

    def delete():
        db.delete(record)
        db.commit()
        return {"message": "Financial Report deleted successfully.", "id": report_id}

    return _commit_or_conflict(db, delete)
