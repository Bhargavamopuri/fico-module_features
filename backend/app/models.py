from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint, Date, DateTime, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class FicoModuleRecord(Base):
    __tablename__ = "fico_module_tb"
    __table_args__ = (
        UniqueConstraint("record_type", "fiscal_year", "period_number", name="uq_fico_period_year_number"),
        CheckConstraint("period_number >= 1 AND period_number <= 12", name="ck_fico_period_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    module_name: Mapped[str] = mapped_column(String(80), nullable=False, default="FICO")
    record_type: Mapped[str] = mapped_column(String(40), nullable=False, default="Fiscal Period")
    fiscal_year: Mapped[str] = mapped_column(String(20), nullable=False)
    period_name: Mapped[str] = mapped_column(String(100), nullable=False)
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False, default="Monthly")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Open")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utc_now, onupdate=utc_now
    )


class FinancialReportRecord(Base):
    __tablename__ = "financial_reports_tb"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_name: Mapped[str] = mapped_column(String(150), nullable=False)
    report_type: Mapped[str] = mapped_column(String(80), nullable=False)
    fiscal_year: Mapped[str] = mapped_column(String(20), nullable=False)
    period: Mapped[str] = mapped_column(String(40), nullable=False, default="All Periods")
    from_date: Mapped[date] = mapped_column(Date, nullable=False)
    to_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Completed")
    report_data: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utc_now, onupdate=utc_now
    )
