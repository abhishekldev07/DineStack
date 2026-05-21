from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.dependencies import get_db

from models.order_model import Order
from models.order_item_model import OrderItem
from models.menu_model import MenuItem
from models.payment_model import Payment

from auth.auth_bearer import JWTBearer
from auth.staff_or_admin import staff_or_admin

from datetime import date
from datetime import datetime

router = APIRouter()


@router.get(
    "/analytics/revenue",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_total_revenue(db: Session = Depends(get_db)):

    revenue = db.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.payment_status == "paid"
    ).scalar()

    if revenue is None:
        revenue = 0

    return {
        "total_revenue": revenue
    }


@router.get(
    "/analytics/orders-count",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_orders_count(db: Session = Depends(get_db)):

    total_orders = db.query(Order).count()

    pending_orders = db.query(Order).filter(
        Order.status == "pending"
    ).count()

    preparing_orders = db.query(Order).filter(
        Order.status == "preparing"
    ).count()

    delivered_orders = db.query(Order).filter(
        Order.status == "delivered"
    ).count()

    cancelled_orders = db.query(Order).filter(
        Order.status == "cancelled"
    ).count()

    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "preparing_orders": preparing_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders
    }


@router.get(
    "/analytics/top-items",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_top_selling_items(db: Session = Depends(get_db)):

    results = db.query(
        MenuItem.id,
        MenuItem.name,
        func.sum(OrderItem.quantity).label("total_quantity_sold")
    ).join(
        OrderItem,
        MenuItem.id == OrderItem.menu_item_id
    ).join(
        Order,
        Order.id == OrderItem.order_id
    ).filter(
        Order.status == "delivered"
    ).group_by(
        MenuItem.id,
        MenuItem.name
    ).order_by(
        func.sum(OrderItem.quantity).desc()
    ).all()

    top_items = []

    for item in results:

        top_items.append({
            "menu_item_id": item.id,
            "name": item.name,
            "total_quantity_sold": item.total_quantity_sold
        })

    return top_items


@router.get(
    "/analytics/revenue/today",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_today_revenue(db: Session = Depends(get_db)):

    today = date.today()

    revenue = db.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.payment_status == "paid",
        func.date(Payment.created_at) == today
    ).scalar()

    if revenue is None:
        revenue = 0

    return {
        "today_revenue": revenue
    }


@router.get(
    "/analytics/revenue/month",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_monthly_revenue(db: Session = Depends(get_db)):

    today = date.today()

    revenue = db.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.payment_status == "paid",
        func.extract("month", Payment.created_at) == today.month,
        func.extract("year", Payment.created_at) == today.year
    ).scalar()

    if revenue is None:
        revenue = 0

    return {
        "monthly_revenue": revenue
    }


@router.get(
    "/analytics/revenue/custom",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_custom_revenue(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):

    try:

        start = datetime.strptime(
            start_date,
            "%Y-%m-%d"
        )

        end = datetime.strptime(
            end_date,
            "%Y-%m-%d"
        )

    except ValueError:

        return {
            "error": "Invalid date format. Use YYYY-MM-DD"
        }

    revenue = db.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.payment_status == "paid",
        func.date(Payment.created_at) >= start.date(),
        func.date(Payment.created_at) <= end.date()
    ).scalar()

    if revenue is None:
        revenue = 0

    return {
        "start_date": start_date,
        "end_date": end_date,
        "revenue": revenue
    }


@router.get(
    "/analytics/dashboard",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_dashboard_data(db: Session = Depends(get_db)):

    # Revenue Analytics

    total_revenue = db.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.payment_status == "paid"
    ).scalar()

    if total_revenue is None:
        total_revenue = 0

    today = date.today()

    today_revenue = db.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.payment_status == "paid",
        func.date(Payment.created_at) == today
    ).scalar()

    if today_revenue is None:
        today_revenue = 0

    monthly_revenue = db.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.payment_status == "paid",
        func.extract("month", Payment.created_at) == today.month,
        func.extract("year", Payment.created_at) == today.year
    ).scalar()

    if monthly_revenue is None:
        monthly_revenue = 0

    # Order Statistics

    total_orders = db.query(Order).count()

    pending_orders = db.query(Order).filter(
        Order.status == "pending"
    ).count()

    preparing_orders = db.query(Order).filter(
        Order.status == "preparing"
    ).count()

    delivered_orders = db.query(Order).filter(
        Order.status == "delivered"
    ).count()

    cancelled_orders = db.query(Order).filter(
        Order.status == "cancelled"
    ).count()

    # Top Selling Items

    top_items_query = db.query(
        MenuItem.name,
        func.sum(OrderItem.quantity).label(
            "total_quantity_sold"
        )
    ).join(
        OrderItem,
        MenuItem.id == OrderItem.menu_item_id
    ).join(
        Order,
        Order.id == OrderItem.order_id
    ).filter(
        Order.status == "delivered"
    ).group_by(
        MenuItem.name
    ).order_by(
        func.sum(OrderItem.quantity).desc()
    ).limit(5).all()

    top_items = []

    for item in top_items_query:

        top_items.append({
            "name": item.name,
            "total_quantity_sold": item.total_quantity_sold
        })

    return {

        "total_revenue": total_revenue,
        "today_revenue": today_revenue,
        "monthly_revenue": monthly_revenue,

        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "preparing_orders": preparing_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,

        "top_items": top_items
    }