import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

PG_HOST = os.environ.get("PG_HOST", "127.0.0.1")
PG_PORT = os.environ.get("PG_PORT", "5433")
PG_USER = os.environ.get("PG_USER", "admin")
PG_PASS = os.environ.get("PG_PASS", "adminpassword")
PG_DB = os.environ.get("PG_DB", "videodb")

SQLALCHEMY_DATABASE_URL = f"postgresql://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
