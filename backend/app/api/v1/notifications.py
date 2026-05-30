from fastapi import APIRouter, HTTPException, Depends, Query
from backend.app.db.supabase_client import supabase
from backend.app.api.v1.auth.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
def get_notifications(
    current_user: str = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False)
):
    """
    Obtiene las notificaciones del usuario actual.
    
    - limit: Número máximo de notificaciones a retornar (default: 50)
    - unread_only: Si es True, solo retorna notificaciones no leídas (default: False)
    """
    try:
        logger.info(f'[Notifications] Fetching for user: {current_user}, limit: {limit}, unread_only: {unread_only}')
        
        # Construir la query
        query = supabase.table("notifications").select("*").eq("user_id", current_user)
        
        # Filtrar no leídas si se especifica
        if unread_only:
            query = query.eq("read", False)
        
        # Ordenar por fecha descendente (más recientes primero) y limitar
        response = query.order("created_at", desc=True).limit(limit).execute()
        
        logger.info(f'[Notifications] Response - Data: {response.data is not None}, Items: {len(response.data) if response.data else 0}, Error: {getattr(response, "error", None)}')
        
        if hasattr(response, 'error') and response.error:
            logger.error(f'[Notifications] Error from Supabase: {response.error}')
            raise HTTPException(status_code=500, detail=f"Error obteniendo notificaciones: {str(response.error)}")
        
        if response.data is None:
            logger.warning('[Notifications] Response.data is None')
            return []
        
        logger.info(f'[Notifications] Returning {len(response.data)} notifications')
        print(f'[DEBUG] Notifications raw data: {response.data}')
        
        return response.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[Notifications] Unexpected error: {str(e)}')
        raise HTTPException(status_code=500, detail=f"Error al obtener notificaciones: {str(e)}")


@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    current_user: str = Depends(get_current_user)
):
    """Marca una notificación como leída."""
    try:
        logger.info(f'[Notifications] Marking notification {notification_id} as read for user: {current_user}')
        
        # Verificar que la notificación pertenece al usuario
        get_response = supabase.table("notifications").select("user_id").eq("id", notification_id).execute()
        
        if not get_response.data:
            logger.warning(f'[Notifications] Notification not found: {notification_id}')
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        
        if get_response.data[0]["user_id"] != current_user:
            logger.warning(f'[Notifications] User {current_user} trying to mark notification {notification_id} of another user')
            raise HTTPException(status_code=403, detail="Acceso denegado")
        
        # Actualizar
        update_response = supabase.table("notifications").update({"read": True}).eq("id", notification_id).execute()
        
        logger.info(f'[Notifications] Update response - Data: {update_response.data}, Error: {getattr(update_response, "error", None)}')
        
        if hasattr(update_response, 'error') and update_response.error:
            logger.error(f'[Notifications] Error updating: {update_response.error}')
            raise HTTPException(status_code=500, detail=f"Error actualizando notificación: {str(update_response.error)}")
        
        return {"message": "Notificación marcada como leída"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[Notifications] Unexpected error: {str(e)}')
        raise HTTPException(status_code=500, detail=f"Error al actualizar notificación: {str(e)}")


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    current_user: str = Depends(get_current_user)
):
    """Elimina una notificación."""
    try:
        logger.info(f'[Notifications] Deleting notification {notification_id} for user: {current_user}')
        
        # Verificar que la notificación pertenece al usuario
        get_response = supabase.table("notifications").select("user_id").eq("id", notification_id).execute()
        
        if not get_response.data:
            logger.warning(f'[Notifications] Notification not found: {notification_id}')
            raise HTTPException(status_code=404, detail="Notificación no encontrada")
        
        if get_response.data[0]["user_id"] != current_user:
            logger.warning(f'[Notifications] User {current_user} trying to delete notification {notification_id} of another user')
            raise HTTPException(status_code=403, detail="Acceso denegado")
        
        # Eliminar
        delete_response = supabase.table("notifications").delete().eq("id", notification_id).execute()
        
        logger.info(f'[Notifications] Delete response - Error: {getattr(delete_response, "error", None)}')
        
        if hasattr(delete_response, 'error') and delete_response.error:
            logger.error(f'[Notifications] Error deleting: {delete_response.error}')
            raise HTTPException(status_code=500, detail=f"Error eliminando notificación: {str(delete_response.error)}")
        
        return {"message": "Notificación eliminada"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f'[Notifications] Unexpected error: {str(e)}')
        raise HTTPException(status_code=500, detail=f"Error al eliminar notificación: {str(e)}")
