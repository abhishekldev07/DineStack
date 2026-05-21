from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session

from database.dependencies import get_db

from models.order_model import Order
from models.order_item_model import OrderItem
from models.menu_model import MenuItem
from models.user_model import User

from auth.auth_bearer import JWTBearer
from auth.staff_or_admin import staff_or_admin

from schemas.order_schema import (
    OrderCreate,
    OrderStatusUpdate,
    OrderEdit
)

from models.payment_model import Payment
router = APIRouter()


def build_order_payload(order, payment, items_data, customer_name=None):
    return {
        "id": order.id,
        "order_id": order.id,
        "user_id": order.user_id,
        "customer_name": customer_name,
        "status": order.status,
        "total_price": order.total_price,
        "created_at": order.created_at,
        "phone_number": order.phone_number,
        "delivery_address": order.delivery_address,
        "latitude": order.latitude,
        "longitude": order.longitude,
        "payment_id": payment.id if payment else None,
        "payment_method": payment.payment_method if payment else None,
        "payment_status": payment.payment_status if payment else None,
        "items": items_data
    }


def normalize_payment_status(value):
    if value is None:
        return None

    normalized_value = value.strip().lower()

    if normalized_value == "pending":
        return "pending_payment"

    return normalized_value


def payment_status_matches(payment_status, filter_status):
    normalized_payment_status = normalize_payment_status(payment_status)
    normalized_filter_status = normalize_payment_status(filter_status)

    if normalized_filter_status == "pending_payment":
        return normalized_payment_status in {"pending", "pending_payment"}

    return normalized_payment_status == normalized_filter_status


@router.post(
    "/orders",
    dependencies=[Depends(JWTBearer())]
)
def create_order(
    order: OrderCreate,
    request: Request,
    db: Session = Depends(get_db)
):

    user = request.state.user

    phone_number = (order.phone_number or "").strip()
    delivery_address = (order.delivery_address or "").strip() or None
    has_coordinates = order.latitude is not None and order.longitude is not None

    if not phone_number:
        raise HTTPException(status_code=400, detail="Phone number is required")

    if not delivery_address and not has_coordinates:
        raise HTTPException(
            status_code=400,
            detail="Delivery address or GPS location is required"
        )

    total_price = 0

    new_order = Order(
        user_id=user["user_id"],
        total_price=0,
        phone_number=phone_number,
        delivery_address=delivery_address,
        latitude=order.latitude if has_coordinates else None,
        longitude=order.longitude if has_coordinates else None
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    for item in order.items:

        menu_item = db.query(MenuItem).filter(
            MenuItem.id == item.menu_item_id
        ).first()

        if not menu_item:
            return {
                "error": f"Menu item {item.menu_item_id} not found"
            }

        subtotal = menu_item.price * item.quantity

        total_price += subtotal

        order_item = OrderItem(
            order_id=new_order.id,
            menu_item_id=menu_item.id,
            quantity=item.quantity,
            subtotal=subtotal
        )

        db.add(order_item)

    new_order.total_price = total_price

    db.commit()
    db.refresh(new_order)

    payment = Payment(
        order_id=new_order.id,
        amount=total_price,
        payment_method="cash",
        payment_status="pending_payment"
    )

    db.add(payment)
    db.commit()

    return {
        "message": "Order placed successfully",
        "order_id": new_order.id,
        "total_price": total_price
    }

@router.put(
    "/orders/{order_id}/status",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db)
):

    order = db.query(Order).filter(
        Order.id == order_id
    ).first()

    if not order:
        return {"error": "Order not found"} 

    order.status = data.status

    db.commit()

    return {
        "message": "Order status updated",
        "new_status": order.status
    }

@router.get(
    "/my-orders",
    dependencies=[Depends(JWTBearer())]
)
def get_my_orders(
    request: Request,
    db: Session = Depends(get_db)
):

    user = request.state.user

    orders = db.query(Order).filter(
        Order.user_id == user["user_id"]
    ).all()

    orders_data = []

    for order in orders:

        payment = db.query(Payment).filter(
            Payment.order_id == order.id
        ).first()

        orders_data.append(
            build_order_payload(order, payment, [])
        )

    return orders_data

@router.get(
    "/my-orders/{order_id}",
    dependencies=[Depends(JWTBearer())]
)
def get_single_order(
    order_id: int,
    request: Request,
    db: Session = Depends(get_db)
):

    user = request.state.user

    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == user["user_id"]
    ).first()

    if not order:
        return {"error": "Order not found"}

    order_items = db.query(OrderItem).filter(
        OrderItem.order_id == order.id
    ).all()

    payment = db.query(Payment).filter(
        Payment.order_id == order.id
    ).first()

    items_data = []

    for item in order_items:

        menu_item = db.query(MenuItem).filter(
            MenuItem.id == item.menu_item_id
        ).first()

        if menu_item:
            menu_item_id = menu_item.id
            name = menu_item.name
            price = menu_item.price
        else:
            menu_item_id = item.menu_item_id
            name = "Deleted item"
            price = (item.subtotal / item.quantity) if item.quantity else 0

        items_data.append({
            "menu_item_id": menu_item_id,
            "name": name,
            "quantity": item.quantity,
            "price": price,
            "subtotal": item.subtotal
        })

    return build_order_payload(order, payment, items_data)

@router.put(
    "/orders/{order_id}",
    dependencies=[Depends(JWTBearer())]
)
def edit_order(
    order_id: int,
    updated_order: OrderEdit,
    request: Request,
    db: Session = Depends(get_db)
):

    user = request.state.user

    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == user["user_id"]
    ).first()

    if not order:
        return {"error": "Order not found"}

    if order.status != "pending":
        return {
            "error": "Only pending orders can be edited"
        }

    old_items = db.query(OrderItem).filter(
        OrderItem.order_id == order.id
    ).all()

    for item in old_items:
        db.delete(item)

    total_price = 0

    for item in updated_order.items:

        menu_item = db.query(MenuItem).filter(
            MenuItem.id == item.menu_item_id
        ).first()

        if not menu_item:
            return {
                "error": f"Menu item {item.menu_item_id} not found"
            }

        subtotal = menu_item.price * item.quantity

        total_price += subtotal

        new_order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            quantity=item.quantity,
            subtotal=subtotal
        )

        db.add(new_order_item)

    order.total_price = total_price

    db.commit()

    return {
        "message": "Order updated successfully",
        "new_total_price": total_price
    }

@router.put(
    "/orders/{order_id}/cancel",
    dependencies=[Depends(JWTBearer())]
)
def cancel_order(
    order_id: int,
    request: Request,
    db: Session = Depends(get_db)
):

    user = request.state.user

    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == user["user_id"]
    ).first()

    if not order:
        return {
            "error": "Order not found"
        }

    if order.status != "pending":
        return {
            "error": "Only pending orders can be cancelled"
        }

    payment = db.query(Payment).filter(
        Payment.order_id == order.id
    ).first()

    order.status = "cancelled"

    if payment:

        normalized_payment_status = normalize_payment_status(payment.payment_status)

        if normalized_payment_status == "paid":
            payment.payment_status = "refunded"

        elif normalized_payment_status == "pending_payment":
            payment.payment_status = "cancelled"

    db.commit()

    return {
        "message": "Order cancelled successfully",
        "order_id": order.id,
        "new_order_status": order.status,
        "payment_status": payment.payment_status if payment else None
    }

@router.get(
    "/all-orders",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_all_orders(
    page: int = 1,
    limit: int = 10,
    payment_status: str | None = None,
    db: Session = Depends(get_db)
):

    skip = (page - 1) * limit

    normalized_payment_status = normalize_payment_status(payment_status)

    orders_query = db.query(Order)

    if normalized_payment_status and normalized_payment_status != "all":
        payment_status_values = (
            ["pending", "pending_payment"]
            if normalized_payment_status == "pending_payment"
            else [normalized_payment_status]
        )

        orders_query = orders_query.join(
            Payment,
            Payment.order_id == Order.id
        ).filter(Payment.payment_status.in_(payment_status_values))

    orders = orders_query\
        .offset(skip)\
        .limit(limit)\
        .all()

    all_orders_data = []

    for order in orders:

        order_items = db.query(OrderItem).filter(
            OrderItem.order_id == order.id
        ).all()

        payment = db.query(Payment).filter(
            Payment.order_id == order.id
        ).first()

        items_data = []

        for item in order_items:

            menu_item = db.query(MenuItem).filter(
                MenuItem.id == item.menu_item_id
            ).first()

            if menu_item:
                menu_item_id = menu_item.id
                name = menu_item.name
                price = menu_item.price
            else:
                menu_item_id = item.menu_item_id
                name = "Deleted item"
                price = (item.subtotal / item.quantity) if item.quantity else 0

            items_data.append({
                "menu_item_id": menu_item_id,
                "name": name,
                "quantity": item.quantity,
                "price": price,
                "subtotal": item.subtotal
            })

        # include customer username for admin view
        user = db.query(User).filter(User.id == order.user_id).first()
        customer_name = user.username if user else None

        all_orders_data.append(
            build_order_payload(order, payment, items_data, customer_name=customer_name)
        )

    return {
        "page": page,
        "limit": limit,
        "orders": all_orders_data
    }

@router.get(
    "/orders/status/{status}",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def get_orders_by_status(
    status: str,
    page: int = 1,
    limit: int = 10,
    payment_status: str | None = None,
    db: Session = Depends(get_db)
):

    valid_statuses = [
        "pending",
        "preparing",
        "delivered",
        "cancelled"
    ]

    if status not in valid_statuses:
        return {"error": "Invalid status"}

    skip = (page - 1) * limit

    normalized_payment_status = normalize_payment_status(payment_status)

    orders_query = db.query(Order).filter(Order.status == status)

    if normalized_payment_status and normalized_payment_status != "all":
        payment_status_values = (
            ["pending", "pending_payment"]
            if normalized_payment_status == "pending_payment"
            else [normalized_payment_status]
        )

        orders_query = orders_query.join(
            Payment,
            Payment.order_id == Order.id
        ).filter(Payment.payment_status.in_(payment_status_values))

    orders = orders_query\
        .offset(skip)\
        .limit(limit)\
        .all()

    all_orders_data = []

    for order in orders:

        order_items = db.query(OrderItem).filter(
            OrderItem.order_id == order.id
        ).all()

        payment = db.query(Payment).filter(
            Payment.order_id == order.id
        ).first()

        items_data = []

        for item in order_items:

            menu_item = db.query(MenuItem).filter(
                MenuItem.id == item.menu_item_id
            ).first()

            if menu_item:
                menu_item_id = menu_item.id
                name = menu_item.name
                price = menu_item.price
            else:
                menu_item_id = item.menu_item_id
                name = "Deleted item"
                price = (item.subtotal / item.quantity) if item.quantity else 0

            items_data.append({
                "menu_item_id": menu_item_id,
                "name": name,
                "quantity": item.quantity,
                "price": price,
                "subtotal": item.subtotal
            })

        user = db.query(User).filter(User.id == order.user_id).first()
        customer_name = user.username if user else None

        all_orders_data.append(
            build_order_payload(order, payment, items_data, customer_name=customer_name)
        )
        

    return {
        "page": page,
        "limit": limit,
        "status": status,
        "orders": all_orders_data
    }
@router.get(
    "/orders/search",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin)
    ]
)
def search_orders(
    search_type: str,
    query: str,
    status: str | None = None,
    payment_status: str | None = None,
    db: Session = Depends(get_db)
):

    normalized_search_type = search_type.strip().lower()

    # allow numeric searches for order/user, and text search for customer name
    numeric_query = None
    try:
        numeric_query = int(query)
    except ValueError:
        # not numeric - acceptable for customer name searches
        numeric_query = None

    valid_order_statuses = {
        "pending",
        "preparing",
        "delivered",
        "cancelled"
    }

    valid_payment_statuses = {
        "pending_payment",
        "pending",
        "paid",
        "failed",
        "refunded",
        "cancelled"
    }

    normalized_status = (
        status.strip().lower()
        if status else None
    )

    normalized_payment_status = normalize_payment_status(payment_status)

    if (
        normalized_status and
        normalized_status != "all" and
        normalized_status not in valid_order_statuses
    ):

        return {
            "error": "Invalid order status filter"
        }

    if (
        normalized_payment_status and
        normalized_payment_status != "all" and
        normalized_payment_status not in valid_payment_statuses
    ):

        return {
            "error": "Invalid payment status filter"
        }

    if normalized_search_type == "order":
        if numeric_query is None:
            return {"error": "Order search requires a numeric ID"}

        orders = db.query(Order).filter(
            Order.id == numeric_query
        ).all()

    elif normalized_search_type == "user":
        if numeric_query is None:
            return {"error": "User search requires a numeric ID"}

        orders = db.query(Order).filter(
            Order.user_id == numeric_query
        ).all()

    elif normalized_search_type == "customer":
        # search by customer username (case-insensitive partial match)
        orders = db.query(Order).join(User, Order.user_id == User.id).filter(
            User.username.ilike(f"%{query}%")
        ).all()

    else:
        return {"error": "Invalid search type"}

    all_orders_data = []

    for order in orders:

        if (
            normalized_status and
            normalized_status != "all" and
            order.status != normalized_status
        ):

            continue

        payment = db.query(Payment).filter(
            Payment.order_id == order.id
        ).first()

        if (
            normalized_payment_status and
            normalized_payment_status != "all" and
            not payment_status_matches(payment.payment_status if payment else None, normalized_payment_status)
        ):

            continue

        order_items = db.query(OrderItem).filter(
            OrderItem.order_id == order.id
        ).all()

        items_data = []

        for item in order_items:

            menu_item = db.query(MenuItem).filter(
                MenuItem.id == item.menu_item_id
            ).first()

            if menu_item:
                menu_item_id = menu_item.id
                name = menu_item.name
                price = menu_item.price
            else:
                menu_item_id = item.menu_item_id
                name = "Deleted item"
                price = (item.subtotal / item.quantity) if item.quantity else 0

            items_data.append({
                "menu_item_id": menu_item_id,
                "name": name,
                "quantity": item.quantity,
                "price": price,
                "subtotal": item.subtotal
            })

        user = db.query(User).filter(User.id == order.user_id).first()
        customer_name = user.username if user else None

        all_orders_data.append(
            build_order_payload(order, payment, items_data, customer_name=customer_name)
        )

    return {
        "orders": all_orders_data
    }