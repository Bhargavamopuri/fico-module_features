from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import FicoModuleRecord, FinancialReportRecord, utc_now
from app.schemas import FiscalPeriodWrite, FinancialReportWrite


def list_fiscal_periods(db: Session) -> list[FicoModuleRecord]:
    statement = (
        select(FicoModuleRecord)
        .where(FicoModuleRecord.record_type == "Fiscal Period")
        .order_by(FicoModuleRecord.start_date, FicoModuleRecord.id)
    )
    return list(db.scalars(statement).all())


def get_fiscal_period(db: Session, period_id: int) -> FicoModuleRecord | None:
    return db.scalar(
        select(FicoModuleRecord).where(
            FicoModuleRecord.id == period_id,
            FicoModuleRecord.record_type == "Fiscal Period",
        )
    )


def create_fiscal_period(db: Session, payload: FiscalPeriodWrite) -> FicoModuleRecord:
    record = FicoModuleRecord(
        module_name="FICO",
        record_type="Fiscal Period",
        **payload.model_dump(mode="python"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_fiscal_period(db: Session, record: FicoModuleRecord, payload: FiscalPeriodWrite) -> FicoModuleRecord:
    for field, value in payload.model_dump(mode="python").items():
        setattr(record, field, value)
    record.updated_at = utc_now()
    db.commit()
    db.refresh(record)
    return record


def delete_fiscal_period(db: Session, record: FicoModuleRecord) -> None:
    db.delete(record)
    db.commit()


def list_financial_reports(db: Session) -> list[FinancialReportRecord]:
    statement = select(FinancialReportRecord).order_by(
        FinancialReportRecord.generated_at.desc(), FinancialReportRecord.id.desc()
    )
    return list(db.scalars(statement).all())


def get_financial_report(db: Session, report_id: int) -> FinancialReportRecord | None:
    return db.get(FinancialReportRecord, report_id)


def sample_report_data(report_type: str) -> dict:
    """Provide structured prototype data for report types without transaction modules."""
    currency = "INR"
    data: dict[str, dict] = {
        "Profit & Loss": {
            "totals": {"revenue": 4825000, "expenses": 2680000, "net_profit": 2145000, "currency": currency},
            "sections": [
                {"name": "Revenue", "rows": [{"name": "Sales Revenue", "amount": 4550000}, {"name": "Other Income", "amount": 275000}]},
                {"name": "Expenses", "rows": [{"name": "Purchase Expenses", "amount": 1250000}, {"name": "Salary Expenses", "amount": 700000}, {"name": "Other Expenses", "amount": 730000}]},
            ],
        },
        "Balance Sheet": {
            "totals": {"assets": 7700000, "liabilities_and_equity": 7700000, "currency": currency},
            "sections": [
                {"name": "Assets", "rows": [{"name": "Cash and Bank", "amount": 2245000}, {"name": "Accounts Receivable", "amount": 975000}, {"name": "Inventory", "amount": 760000}, {"name": "Fixed Assets", "amount": 3720000}]},
                {"name": "Liabilities and Equity", "rows": [{"name": "Accounts Payable", "amount": 850000}, {"name": "Loans and Other Liabilities", "amount": 1800000}, {"name": "Equity", "amount": 5050000}]},
            ],
        },
        "Trial Balance": {
            "totals": {"debit": 8000000, "credit": 8000000, "currency": currency},
            "rows": [
                {"account_code": "1001", "account_name": "Cash", "debit": 825000, "credit": 0},
                {"account_code": "1002", "account_name": "Bank", "debit": 1420000, "credit": 0},
                {"account_code": "1100", "account_name": "Accounts Receivable", "debit": 975000, "credit": 0},
                {"account_code": "4001", "account_name": "Sales", "debit": 0, "credit": 4550000},
                {"account_code": "5001", "account_name": "Purchase", "debit": 1250000, "credit": 0},
            ],
        },
        "General Ledger": {
            "account": "Cash",
            "rows": [
                {"date": "2026-04-01", "document_no": "OP-2026-001", "description": "Opening balance", "debit": 500000, "credit": 0, "balance": 500000},
                {"date": "2026-04-04", "document_no": "RC-2026-018", "description": "Customer receipt", "debit": 275000, "credit": 0, "balance": 775000},
                {"date": "2026-04-06", "document_no": "PV-2026-027", "description": "Office rent payment", "debit": 0, "credit": 85000, "balance": 690000},
            ],
        },
        "Accounts Receivable": {
            "totals": {"outstanding": 965000, "currency": currency},
            "rows": [{"customer": "Northwind Traders", "invoice_no": "AR-2026-103", "invoice_amount": 425000, "paid": 275000, "outstanding": 150000, "status": "Partially Paid"}],
        },
        "Accounts Payable": {
            "totals": {"outstanding": 453000, "currency": currency},
            "rows": [{"vendor": "Acme Supply Co.", "invoice_no": "AP-2026-045", "invoice_amount": 350000, "paid": 220000, "outstanding": 130000, "status": "Partially Paid"}],
        },
        "Cash Flow Statement": {
            "totals": {"opening_cash": 1250000, "net_change": 450000, "closing_cash": 1700000, "currency": currency},
            "sections": [
                {"name": "Operating Activities", "net_cash": 450000},
                {"name": "Investing Activities", "net_cash": -320000},
                {"name": "Financing Activities", "net_cash": 320000},
            ],
        },
        "Fixed Asset Report": {
            "totals": {"purchase_value": 3575000, "depreciation": 587000, "net_book_value": 2988000, "currency": currency},
            "rows": [{"asset_code": "FA-0012", "asset_name": "CNC Production Machinery", "purchase_value": 1850000, "depreciation": 277500, "net_book_value": 1572500, "status": "Active"}],
        },
        "Budget vs Actual": {
            "totals": {"budget": 7650000, "actual": 7855000, "variance": -205000, "currency": currency},
            "rows": [{"account": "Sales Revenue", "budget": 4500000, "actual": 4825000, "variance": -325000, "status": "Over Budget"}],
        },
        "GST / Tax Report": {
            "totals": {"taxable_amount": 1188000, "cgst": 77700, "sgst": 77700, "igst": 58500, "total_gst": 213900, "currency": currency},
            "rows": [{"document_no": "AR-2026-101", "party": "Northwind Traders", "taxable_amount": 485000, "cgst": 43650, "sgst": 43650, "igst": 0, "total_tax": 87300}],
        },
    }
    return data[report_type]


def create_financial_report(
    db: Session,
    payload: FinancialReportWrite,
    *,
    generated: bool,
) -> FinancialReportRecord:
    now = utc_now()
    record = FinancialReportRecord(
        **payload.model_dump(mode="python"),
        status="Completed" if generated else "Draft",
        report_data=sample_report_data(payload.report_type) if generated else None,
        generated_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
