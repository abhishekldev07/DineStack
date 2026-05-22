# import os

# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker, declarative_base

# DATABASE_URL = os.getenv(
#     "DATABASE_URL",
#     "postgresql+psycopg2://postgres:dinestack6509%40@localhost:5432/dinestack_db"
# )

# engine = create_engine(DATABASE_URL)

# SessionLocal = sessionmaker(
#     autocommit=False,
#     autoflush=False,
#     bind=engine
# )

# Base = declarative_base()

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Fetch the Railway-provided URL
raw_url = os.getenv("DATABASE_URL")

# 2. Fix the driver for SQLAlchemy (Railway uses postgres://, we need postgresql+psycopg2://)
if raw_url and raw_url.startswith("postgresql://"):
    DATABASE_URL = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
else:
    # Fallback for local dev if DATABASE_URL is missing
    DATABASE_URL = "postgresql+psycopg2://postgres:dinestack6509%40@localhost:5432/dinestack_db"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()