import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database.connection import engine, Base
from sqlalchemy import text
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

# Route Imports
from routes.menu_routes import router as menu_router
from routes.user_routes import router as user_router
from auth.auth_routes import router as auth_router
from routes.order_routes import router as order_router
from routes.reservation_routes import router as reservation_router
from routes.admin_user_routes import router as admin_user_router
from analytics.analytics_routes import router as analytics_router
from routes.payment_routes import router as payment_router

# Model Imports to guarantee registration with metadata
from models.menu_model import MenuItem
from models.user_model import User
from models.refresh_token_model import RefreshToken
from models.order_model import Order
from models.reservation_model import Reservation
from models.order_item_model import OrderItem
from models.payment_model import Payment

# SINGLE INITIALIZATION OF FASTAPI
app = FastAPI()

# Uploads Configuration
UPLOADS_DIR = Path("/app/uploads")
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads"
)

# CORS Origins Setup
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Tables Sync
Base.metadata.create_all(bind=engine)

def ensure_order_location_columns():
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone_number VARCHAR"))
        connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address VARCHAR"))
        connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude FLOAT"))
        connection.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude FLOAT"))

def ensure_user_verification_columns():
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE"))
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR"))
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP WITH TIME ZONE"))
        connection.execute(text("UPDATE users SET is_verified = TRUE WHERE verification_token IS NULL AND verification_token_expires IS NULL"))
        connection.execute(text("UPDATE users SET created_at = COALESCE(created_at, NOW())"))

def ensure_reservation_columns():
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'pending_payment'"))
        connection.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_method VARCHAR"))
        connection.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS transaction_id VARCHAR"))
        connection.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS paid_amount FLOAT DEFAULT 0"))
        connection.execute(text("ALTER TABLE reservations ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE"))

ensure_order_location_columns()
ensure_user_verification_columns()
ensure_reservation_columns()

# Router Registrations
app.include_router(menu_router)
app.include_router(user_router)
app.include_router(auth_router)
app.include_router(order_router)
app.include_router(reservation_router)
app.include_router(admin_user_router)
app.include_router(analytics_router)
app.include_router(payment_router)

@app.get("/")
def home():
    return {"message": "DineStack Backend Running"}