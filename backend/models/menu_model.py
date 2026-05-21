from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from database.connection import Base
from datetime import datetime

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    image_url = Column(String)
    available = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)