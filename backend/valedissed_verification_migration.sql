-- ============================================================
-- VALEDISSED: MIGRACIÓN PARA VERIFICACIÓN DE SOCIOS (PARTNERS)
-- ============================================================

-- 1. Agregar nuevas columnas de verificación facial a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS id_face_url TEXT;

-- 2. Crear la tabla de solicitudes de socio (partner_requests)
CREATE TABLE IF NOT EXISTS partner_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    partner_type TEXT CHECK (partner_type IN ('vendedor', 'especialista', 'hibrido')) NOT NULL,
    business_name TEXT NOT NULL,
    partner_phone TEXT NOT NULL,
    operation_zone TEXT NOT NULL,
    years_experience INTEGER NOT NULL,
    bio TEXT NOT NULL,
    partner_product_categories TEXT[],
    partner_service_categories TEXT[],
    certification_url TEXT, -- Archivo PDF/Imagen de diplomas
    id_face_url TEXT,       -- Selfie / Documento para verificación facial
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    admin_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de RLS para partner_requests
-- Eliminar políticas previas si existen
DROP POLICY IF EXISTS "users_read_own_requests" ON partner_requests;
DROP POLICY IF EXISTS "users_create_requests" ON partner_requests;
DROP POLICY IF EXISTS "admin_all_requests" ON partner_requests;

-- Permitir a usuarios ver sus propias solicitudes
CREATE POLICY "users_read_own_requests" ON partner_requests 
FOR SELECT USING (auth.uid() = user_id);

-- Permitir a usuarios enviar nuevas solicitudes
CREATE POLICY "users_create_requests" ON partner_requests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permitir a los administradores hacer cualquier operación
CREATE POLICY "admin_all_requests" ON partner_requests 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
