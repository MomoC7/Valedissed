from fastapi import APIRouter, HTTPException, Depends, Query
from backend.app.db.supabase_client import supabase
from backend.app.api.v1.auth.auth import get_current_user
from backend.app.schemas.wall import (
    WallRequestCreate, 
    WallRequestResponse,
    WallRequestUpdate,
    WallRequestItemResponse
)
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import math

router = APIRouter()

def calculate_age(birthdate_str: str) -> Optional[int]:
    """Calcula la edad a partir de una fecha de nacimiento."""
    if not birthdate_str:
        return None
    try:
        birthdate = datetime.fromisoformat(birthdate_str).date()
        today = datetime.now().date()
        age = today.year - birthdate.year - ((today.month, today.day) < (birthdate.month, birthdate.day))
        return age
    except:
        return None

@router.get("/", response_model=List[WallRequestResponse])
def list_wall_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    exclude_completed: bool = Query(True)
):
    """
    Lista todas las solicitudes del tablón.
    El tablón es público para que todos vean las solicitudes activas.
    """
    try:
        query = supabase.table("the_wall_requests").select(
            "*, profiles(username, avatar_url, birthdate, gender)"
        )
        
        if exclude_completed:
            query = query.eq("is_completed", False)
        
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        
        if response.error:
            raise HTTPException(status_code=500, detail=f"Error listando solicitudes: {response.error.message or str(response.error)}")
        
        requests_data = response.data or []
        result = []
        
        for req in requests_data:
            # Obtener items de la solicitud
            items_response = supabase.table("the_wall_request_items").select(
                "*, products(name, price, cover_image_url)"
            ).eq("request_id", req["id"]).execute()
            
            items = []
            total_price = 0
            total_items = 0
            
            if items_response.data:
                for item in items_response.data:
                    product = item.get("products")
                    items.append(WallRequestItemResponse(
                        id=item["id"],
                        product_id=item["product_id"],
                        quantity=item["quantity"],
                        product_name=product.get("name") if product else None,
                        product_price=float(product.get("price")) if product else None,
                        product_cover_image=product.get("cover_image_url") if product else None
                    ))
                    if product:
                        total_price += float(product.get("price", 0)) * item["quantity"]
                        total_items += item["quantity"]
            
            user_profile = req.get("profiles")
            result.append(WallRequestResponse(
                id=req["id"],
                user_id=req["user_id"],
                title=req.get("title"),
                message=req.get("message"),
                is_completed=req.get("is_completed", False),
                expires_at=req["expires_at"],
                created_at=req["created_at"],
                updated_at=req.get("updated_at", req["created_at"]),
                user_username=user_profile.get("username") if user_profile else None,
                user_avatar=user_profile.get("avatar_url") if user_profile else None,
                user_age=calculate_age(user_profile.get("birthdate")) if user_profile else None,
                user_gender=user_profile.get("gender") if user_profile else None,
                items=items,
                total_items=total_items,
                total_price=round(total_price, 2)
            ))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{request_id}", response_model=WallRequestResponse)
def get_wall_request(request_id: UUID):
    """
    Obtiene los detalles de una solicitud específica del tablón.
    Público para todos.
    """
    try:
        response = supabase.table("the_wall_requests").select(
            "*, profiles(username, avatar_url, birthdate, gender)"
        ).eq("id", str(request_id)).execute()
        
        if response.error or not response.data:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        req = response.data[0]
        
        # Obtener items
        items_response = supabase.table("the_wall_request_items").select(
            "*, products(name, price, cover_image_url)"
        ).eq("request_id", str(request_id)).execute()
        
        items = []
        total_price = 0
        total_items = 0
        
        if items_response.data:
            for item in items_response.data:
                product = item.get("products")
                items.append(WallRequestItemResponse(
                    id=item["id"],
                    product_id=item["product_id"],
                    quantity=item["quantity"],
                    product_name=product.get("name") if product else None,
                    product_price=float(product.get("price")) if product else None,
                    product_cover_image=product.get("cover_image_url") if product else None
                ))
                if product:
                    total_price += float(product.get("price", 0)) * item["quantity"]
                    total_items += item["quantity"]
        
        user_profile = req.get("profiles")
        return WallRequestResponse(
            id=req["id"],
            user_id=req["user_id"],
            title=req.get("title"),
            message=req.get("message"),
            is_completed=req.get("is_completed", False),
            expires_at=req["expires_at"],
            created_at=req["created_at"],
            updated_at=req.get("updated_at", req["created_at"]),
            user_username=user_profile.get("username") if user_profile else None,
            user_avatar=user_profile.get("avatar_url") if user_profile else None,
            user_age=calculate_age(user_profile.get("birthdate")) if user_profile else None,
            user_gender=user_profile.get("gender") if user_profile else None,
            items=items,
            total_items=total_items,
            total_price=round(total_price, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=WallRequestResponse)
def create_wall_request(
    request_data: WallRequestCreate,
    current_user_id: str = Depends(get_current_user)
):
    """
    Crea una nueva solicitud en el tablón.
    Solo puede haber una solicitud activa por usuario a la vez.
    """
    try:
        # Verificar que el usuario no tenga una solicitud activa pendiente
        existing = supabase.table("the_wall_requests").select(
            "id"
        ).eq("user_id", current_user_id).eq("is_completed", False).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=409, 
                detail="Ya tienes una solicitud activa en el tablón. Complétala o elimínala antes de crear una nueva."
            )
        
        # Crear la solicitud
        new_request = {
            "user_id": current_user_id,
            "title": request_data.title,
            "message": request_data.message,
            "is_completed": False
        }
        
        req_response = supabase.table("the_wall_requests").insert(new_request).execute()
        
        if req_response.error or not req_response.data:
            raise HTTPException(status_code=500, detail=f"Error creando solicitud: {req_response.error}")
        
        request_id = req_response.data[0]["id"]
        
        # Insertar los items
        for item_data in request_data.items:
            item_to_insert = {
                "request_id": request_id,
                "product_id": str(item_data.product_id),
                "quantity": item_data.quantity
            }
            item_response = supabase.table("the_wall_request_items").insert(item_to_insert).execute()
            
            if item_response.error:
                # Eliminar la solicitud si hay error
                supabase.table("the_wall_requests").delete().eq("id", request_id).execute()
                raise HTTPException(status_code=500, detail=f"Error añadiendo productos: {item_response.error}")
        
        # Retornar la solicitud completa
        return get_wall_request(UUID(request_id))
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{request_id}", response_model=WallRequestResponse)
def update_wall_request(
    request_id: UUID,
    update_data: WallRequestUpdate,
    current_user_id: str = Depends(get_current_user)
):
    """
    Actualiza una solicitud del tablón.
    Solo el propietario puede actualizar su solicitud.
    """
    try:
        # Verificar que es el propietario
        check_response = supabase.table("the_wall_requests").select("user_id").eq("id", str(request_id)).execute()
        
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        if check_response.data[0]["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="No tienes permisos para actualizar esta solicitud")
        
        # Actualizar
        update_payload = {}
        if update_data.is_completed is not None:
            update_payload["is_completed"] = update_data.is_completed
        if update_data.message is not None:
            update_payload["message"] = update_data.message
        
        upd_response = supabase.table("the_wall_requests").update(update_payload).eq("id", str(request_id)).execute()
        
        if upd_response.error:
            raise HTTPException(status_code=500, detail=f"Error actualizando solicitud: {upd_response.error}")
        
        return get_wall_request(request_id)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{request_id}")
def delete_wall_request(
    request_id: UUID,
    current_user_id: str = Depends(get_current_user)
):
    """
    Elimina una solicitud del tablón.
    Solo el propietario puede eliminar su solicitud.
    """
    try:
        # Verificar que es el propietario
        check_response = supabase.table("the_wall_requests").select("user_id").eq("id", str(request_id)).execute()
        
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        if check_response.data[0]["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="No tienes permisos para eliminar esta solicitud")
        
        # Eliminar (los items se eliminan en cascada)
        del_response = supabase.table("the_wall_requests").delete().eq("id", str(request_id)).execute()
        
        if del_response.error:
            raise HTTPException(status_code=500, detail=f"Error eliminando solicitud: {del_response.error}")
        
        return {"message": "Solicitud eliminada"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/active")
def get_user_active_request(user_id: UUID):
    """
    Obtiene la solicitud activa de un usuario específico.
    Útil para saber si el usuario tiene una solicitud pendiente.
    """
    try:
        response = supabase.table("the_wall_requests").select(
            "id, user_id, is_completed, created_at"
        ).eq("user_id", str(user_id)).eq("is_completed", False).execute()
        
        if response.data:
            return {"has_active_request": True, "request_id": response.data[0]["id"]}
        else:
            return {"has_active_request": False, "request_id": None}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
