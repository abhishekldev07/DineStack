from pathlib import Path
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database.dependencies import get_db
from models.menu_model import MenuItem
from schemas.menu_schema import MenuAvailabilityUpdate, MenuCreate

from auth.auth_bearer import JWTBearer
from auth.role_checker import (
    admin_required,
    staff_or_admin_required
)

router = APIRouter()

UPLOADS_ROOT = Path("/app/uploads")
MENU_UPLOADS_DIR = UPLOADS_ROOT / "menu_items"
MENU_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}
ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _is_local_menu_upload(image_url: Optional[str]) -> bool:
    return bool(image_url and image_url.startswith("/uploads/menu_items/"))


# def _delete_menu_image(image_url: Optional[str]) -> None:
#     if not _is_local_menu_upload(image_url):
#         return

#     filename = Path(image_url).name
#     file_path = MENU_UPLOADS_DIR / filename

#     if uploads_root not in file_path.parents:
#         return

#     if file_path.exists() and file_path.is_file():
#         file_path.unlink()
def _delete_menu_image(image_url: Optional[str]) -> None:
    if not _is_local_menu_upload(image_url):
        return

    filename = Path(image_url).name
    file_path = MENU_UPLOADS_DIR / filename

    if file_path.exists() and file_path.is_file():
        file_path.unlink()


async def _save_uploaded_menu_image(image: UploadFile) -> str:
    extension = Path(image.filename or "").suffix.lower()
    content_type = (image.content_type or "").lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed formats: jpg, jpeg, png, webp."
        )

    if content_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid MIME type. Allowed formats: jpg, jpeg, png, webp."
        )

    filename = f"menu_{uuid4().hex}{extension}"
    destination = MENU_UPLOADS_DIR / filename
    size_bytes = 0

    try:
        with destination.open("wb") as output_file:
            while True:
                chunk = await image.read(1024 * 1024)
                if not chunk:
                    break

                size_bytes += len(chunk)
                if size_bytes > MAX_IMAGE_BYTES:
                    raise HTTPException(
                        status_code=400,
                        detail="Image size exceeds 5MB limit."
                    )

                output_file.write(chunk)
    except HTTPException:
        if destination.exists():
            destination.unlink()
        raise
    except Exception:
        if destination.exists():
            destination.unlink()
        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded image."
        )
    finally:
        await image.close()

    return f"/uploads/menu_items/{filename}"


@router.post(
    "/menu",
    dependencies=[
        Depends(JWTBearer()),
        Depends(admin_required)
    ]
)
async def create_menu_item(
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    available: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    image_url = await _save_uploaded_menu_image(image) if image else None

    new_item = MenuItem(
        name=name,
        category=category,
        description=description,
        price=price,
        image_url=image_url,
        available=available
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {
        "message": "Menu item created",
        "data": new_item
    }


@router.post(
    "/menu/bulk",
    dependencies=[
        Depends(JWTBearer()),
        Depends(admin_required)
    ]
)
def create_bulk_menu(items: list[MenuCreate], db: Session = Depends(get_db)):

    menu_items = []

    for item in items:

        new_item = MenuItem(
            name=item.name,
            description=item.description,
            price=item.price,
            category=item.category,
            image_url=item.image_url,
            available=item.available
        )

        menu_items.append(new_item)

    db.add_all(menu_items)
    db.commit()

    return {"message": "Bulk menu inserted successfully"}


@router.get("/menu/latest")
def latest_items(db: Session = Depends(get_db)):

    items = db.query(MenuItem)\
        .order_by(MenuItem.created_at.desc())\
        .all()

    return items



@router.get("/menu")
def get_menu_items(db: Session = Depends(get_db)):
    # Only return available items to customers
    items = db.query(MenuItem).filter(MenuItem.available == True).all()
    return items



@router.get("/menu/category/{category_name}")
def get_menu_by_category(category_name: str, db: Session = Depends(get_db)):

    items = db.query(MenuItem).filter(
        MenuItem.category == category_name,
        MenuItem.available == True
    ).all()
    return items


# --- 3. UPDATE THE SEARCH ROUTE ---
@router.get("/menu/search/{search_term}")
def search_menu(search_term: str, db: Session = Depends(get_db)):

    items = db.query(MenuItem).filter(
        MenuItem.name.ilike(f"%{search_term}%"),
        MenuItem.available == True
    ).all()
    return items



@router.get("/menu/sort/{order}")
def sort_menu(order: str, db: Session = Depends(get_db)):

    base_query = db.query(MenuItem).filter(MenuItem.available == True)

    if order == "asc":
        items = base_query.order_by(MenuItem.price.asc()).all()
    elif order == "desc":
        items = base_query.order_by(MenuItem.price.desc()).all()
    else:
        return {"error": "Invalid sort order"}

    return items


@router.delete(
    "/menu/{item_id}",
    dependencies=[
        Depends(JWTBearer()),
        Depends(admin_required)
    ]
)
def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    db.query(MenuItem).filter(MenuItem.id == item_id).update(
        {"available": False}, 
        synchronize_session="fetch"
    )
    
    db.commit()

    return {"message": f"'{item.name}' has been safely removed from the active menu."}


@router.get("/menu/{item_id}")
def get_single_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()

    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    return item

@router.put(
    "/menu/{item_id}",
    dependencies=[
        Depends(JWTBearer()),
        Depends(admin_required)
    ]
)
async def update_menu_item(
    item_id: int,
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    available: bool = Form(True),
    remove_image: bool = Form(False),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):

    item = db.query(MenuItem).filter(
        MenuItem.id == item_id
    ).first()

    if not item:
        return {"error": "Menu item not found"}

    old_image_url = item.image_url
    new_image_url = old_image_url

    if image:
        new_image_url = await _save_uploaded_menu_image(image)
    elif remove_image:
        new_image_url = None

    item.name = name
    item.category = category
    item.description = description
    item.price = price
    item.image_url = new_image_url
    item.available = available

    try:
        db.commit()
    except Exception:
        db.rollback()
        if image and new_image_url != old_image_url:
            _delete_menu_image(new_image_url)
        raise

    db.refresh(item)

    if image and old_image_url != new_image_url:
        _delete_menu_image(old_image_url)

    if remove_image and old_image_url and old_image_url != new_image_url:
        _delete_menu_image(old_image_url)

    return {
        "message": "Menu item updated successfully",
        "data": item
    }


@router.patch(
    "/menu/{item_id}/availability",
    dependencies=[
        Depends(JWTBearer()),
        Depends(staff_or_admin_required)
    ]
)
def update_menu_availability(
    item_id: int,
    data: MenuAvailabilityUpdate,
    db: Session = Depends(get_db)
):

    item = db.query(MenuItem).filter(
        MenuItem.id == item_id
    ).first()

    if not item:
        return {"error": "Menu item not found"}

    item.available = data.available

    db.commit()
    db.refresh(item)

    return {
        "message": "Menu item availability updated successfully",
        "data": item
    }