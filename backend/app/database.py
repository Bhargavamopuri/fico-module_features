import os
import re
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "fico_module_db")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5175")

if DB_NAME != "fico_module_db":
    raise ValueError("DB_NAME must be fico_module_db for this application.")
if not DB_PASSWORD:
    raise ValueError("DB_PASSWORD is required in backend/.env.")
if not re.fullmatch(r"[A-Za-z0-9_]+", DB_NAME):
    raise ValueError("DB_NAME may contain only letters, numbers, and underscores.")


def _mysql_url() -> URL:
    return URL.create(
        drivername="mysql+pymysql",
        username=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        query={"charset": "utf8mb4"},
    )


engine = create_engine(_mysql_url(), pool_pre_ping=True, pool_recycle=1800)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def initialize_database() -> None:
    """Verify the configured MySQL database and create missing tables only."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        # Importing models registers their tables on Base.metadata.
        from app import models  # noqa: F401

        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        raise RuntimeError(mysql_connection_error(exc)) from exc


def mysql_connection_error(exc: Exception) -> str:
    """Describe common MySQL setup failures without exposing connection credentials."""
    original = getattr(exc, "orig", exc)
    error_args = getattr(original, "args", ())
    code = error_args[0] if error_args and isinstance(error_args[0], int) else None

    if isinstance(exc, ModuleNotFoundError) or isinstance(original, ModuleNotFoundError):
        return "MySQL driver is not installed. Install backend/requirements.txt in the active Python environment."
    if code == 1045:
        return "MySQL access denied for the configured user. Check DB_USER and DB_PASSWORD in backend/.env."
    if code == 1049:
        return f"MySQL database '{DB_NAME}' was not found. Create it in MySQL Workbench before starting the API."
    if code in {2002, 2003, 2006, 2013}:
        return f"Cannot connect to MySQL at {DB_HOST}:{DB_PORT}. Check that MySQL Server is running and listening."
    if code in {1044, 1142, 1143}:
        return f"The configured MySQL user lacks permission to access '{DB_NAME}' or create its tables."
    return f"MySQL database '{DB_NAME}' connection or table initialization failed. Check the server and backend/.env."


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
