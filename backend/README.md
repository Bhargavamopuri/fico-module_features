# FICO API setup

The FastAPI service stores Fiscal Periods and generated Financial Reports in MySQL. It creates `fico_module_db` and the `fico_module_tb` and `financial_reports_tb` tables on first startup. The configured MySQL user must be allowed to create the database and tables.

## Configure and run

Python 3.15 is supported by the current dependency versions in `requirements.txt`. The earlier pinned versions of Pydantic/FastAPI and Uvicorn's optional `standard` extras did not have usable Windows Python 3.15 wheels, so this setup uses current versions and the base Uvicorn package. From the project root in PowerShell:

```powershell
py -3.15 -m venv backend\.venv
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` locally and set the MySQL host, port, username, and password. Do not commit or share that file. Start the API:

```powershell
backend\.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

The frontend defaults to `http://localhost:8000`; set `VITE_API_URL` in `frontend\.env` only if the API runs elsewhere. The API accepts the frontend origins configured by `FRONTEND_ORIGIN` and the default Vite development origins.

Start the frontend from the project root with `npm run dev`.

Startup does not seed mock Fiscal Period rows or alter existing records; it verifies MySQL and creates only missing tables. Financial report generation stores a report record and structured prototype report data (shown as sample data in the UI); it does not connect to a transaction ledger.

## Verify in MySQL Workbench

After the API starts successfully, use:

```sql
USE fico_module_db;

SELECT id, fiscal_year, period_name, period_number, start_date, end_date, period_type, status
FROM fico_module_tb
WHERE record_type = 'Fiscal Period'
ORDER BY start_date, id;

SELECT id, report_name, report_type, fiscal_year, period, status, generated_at
FROM financial_reports_tb
ORDER BY generated_at DESC, id DESC;
```

The API health endpoint is `http://localhost:8000/health`; it reports whether MySQL is connected.
