from datetime import date, datetime
from enum import Enum
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class PeriodStatus(str, Enum):
    OPEN = "Open"
    CLOSED = "Closed"
    UPCOMING = "Upcoming"


class PeriodType(str, Enum):
    MONTHLY = "Monthly"
    QUARTERLY = "Quarterly"
    HALF_YEARLY = "Half-Yearly"
    YEARLY = "Yearly"


class FiscalPeriodWrite(BaseModel):
    fiscal_year: str = Field(min_length=9, max_length=20)
    period_name: str = Field(min_length=1, max_length=100)
    period_number: int = Field(ge=1, le=12)
    start_date: date
    end_date: date
    period_type: PeriodType = PeriodType.MONTHLY
    status: PeriodStatus
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("fiscal_year")
    @classmethod
    def validate_fiscal_year(cls, value: str) -> str:
        normalized = re.sub(r"\s*-\s*", " - ", value.strip())
        match = re.fullmatch(r"(\d{4}) - (\d{4})", normalized)
        if not match or int(match.group(2)) != int(match.group(1)) + 1:
            raise ValueError("Fiscal year must be consecutive years in YYYY - YYYY format.")
        return normalized

    @field_validator("period_name")
    @classmethod
    def validate_period_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Period name cannot be empty.")
        return cleaned

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.start_date >= self.end_date:
            raise ValueError("End date must be after the start date.")
        first_year, second_year = (int(part.strip()) for part in self.fiscal_year.split("-"))
        fiscal_start = date(first_year, 4, 1)
        fiscal_end = date(second_year, 3, 31)
        if self.start_date < fiscal_start or self.start_date > fiscal_end:
            raise ValueError("Start date must fall within the selected fiscal year (April to March).")
        if self.end_date < fiscal_start or self.end_date > fiscal_end:
            raise ValueError("End date must fall within the selected fiscal year (April to March).")
        return self


class FiscalPeriodRead(FiscalPeriodWrite):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module_name: str
    record_type: str
    created_at: datetime
    updated_at: datetime


REPORT_TYPES = (
    "Profit & Loss",
    "Balance Sheet",
    "Trial Balance",
    "General Ledger",
    "Accounts Receivable",
    "Accounts Payable",
    "Cash Flow Statement",
    "Fixed Asset Report",
    "Budget vs Actual",
    "GST / Tax Report",
)


class FinancialReportWrite(BaseModel):
    report_name: str = Field(min_length=1, max_length=150)
    report_type: str = Field(min_length=1, max_length=80)
    fiscal_year: str = Field(min_length=9, max_length=20)
    period: str = Field(default="All Periods", min_length=1, max_length=40)
    from_date: date
    to_date: date

    @field_validator("report_name", "period")
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty.")
        return cleaned

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, value: str) -> str:
        cleaned = value.strip()
        if cleaned not in REPORT_TYPES:
            raise ValueError(f"Report type must be one of: {', '.join(REPORT_TYPES)}.")
        return cleaned

    @field_validator("fiscal_year")
    @classmethod
    def validate_report_year(cls, value: str) -> str:
        normalized = re.sub(r"\s*-\s*", " - ", value.strip())
        match = re.fullmatch(r"(\d{4}) - (\d{4})", normalized)
        if not match or int(match.group(2)) != int(match.group(1)) + 1:
            raise ValueError("Fiscal year must be consecutive years in YYYY - YYYY format.")
        return normalized

    @model_validator(mode="after")
    def validate_report_dates(self):
        if self.from_date > self.to_date:
            raise ValueError("From date cannot be after to date.")
        return self


class FinancialReportRead(FinancialReportWrite):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    report_data: dict | list | None
    generated_at: datetime
    created_at: datetime
    updated_at: datetime
