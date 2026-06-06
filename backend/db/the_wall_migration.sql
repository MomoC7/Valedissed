-- ================================================================
-- MIGRACIÓN: THE WALL - TABLÓN DE DESEOS
-- ================================================================
-- Archivo de migración separado para agregar funcionalidad de The Wall
-- a la base de datos de Valedissed.
--
-- Pasos:
-- 1. Ejecuta este archivo DESPUÉS de ejecutar valedissed_full_schema.sql
-- 2. Copia todo el contenido y pégalo en Supabase SQL Editor
-- 3. Ejecuta y verifica que no haya errores
-- ================================================================

-- Paso 1: Agregar campo birthdate a profiles (para calcular edad)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Paso 2: Actualizar estructura de the_wall_requests
-- Agregar nuevos campos y actualizar restricciones
ALTER TABLE public.the_wall_requests
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  DROP COLUMN IF EXISTS product_id,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id DROP DEFAULT;

-- Paso 3: Crear tabla the_wall_request_items (relación muchos-a-muchos)
CREATE TABLE IF NOT EXISTS public.the_wall_request_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.the_wall_requests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT wall_items_unique UNIQUE (request_id, product_id)
);

-- Paso 4: Crear índices para mejores queries
CREATE INDEX IF NOT EXISTS idx_wall_requests_user_id ON public.the_wall_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wall_requests_is_completed ON public.the_wall_requests(is_completed);
CREATE INDEX IF NOT EXISTS idx_wall_requests_created_at ON public.the_wall_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wall_items_request_id ON public.the_wall_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_wall_items_product_id ON public.the_wall_request_items(product_id);

-- Paso 5: Habilitar RLS en the_wall_requests
ALTER TABLE public.the_wall_requests ENABLE ROW LEVEL SECURITY;

-- El tablón es público para leer, solo el owner puede modificar
DROP POLICY IF EXISTS wall_requests_select ON public.the_wall_requests;
CREATE POLICY wall_requests_select ON public.the_wall_requests 
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS wall_requests_insert ON public.the_wall_requests;
CREATE POLICY wall_requests_insert ON public.the_wall_requests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS wall_requests_update ON public.the_wall_requests;
CREATE POLICY wall_requests_update ON public.the_wall_requests 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS wall_requests_delete ON public.the_wall_requests;
CREATE POLICY wall_requests_delete ON public.the_wall_requests 
  FOR DELETE USING (auth.uid() = user_id);

-- Paso 6: Habilitar RLS en the_wall_request_items
ALTER TABLE public.the_wall_request_items ENABLE ROW LEVEL SECURITY;

-- Items son públicos para leer si están en solicitudes públicas
DROP POLICY IF EXISTS wall_items_select ON public.the_wall_request_items;
CREATE POLICY wall_items_select ON public.the_wall_request_items 
  FOR SELECT USING (TRUE);

-- Solo el propietario de la solicitud puede insertar items
DROP POLICY IF EXISTS wall_items_insert ON public.the_wall_request_items;
CREATE POLICY wall_items_insert ON public.the_wall_request_items 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.the_wall_requests wr 
      WHERE wr.id = request_id AND wr.user_id = auth.uid()
    )
  );

-- Solo el propietario puede eliminar items
DROP POLICY IF EXISTS wall_items_delete ON public.the_wall_request_items;
CREATE POLICY wall_items_delete ON public.the_wall_request_items 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.the_wall_requests wr 
      WHERE wr.id = request_id AND wr.user_id = auth.uid()
    )
  );

-- Paso 7: Crear función trigger para actualizar updated_at en the_wall_requests
CREATE OR REPLACE FUNCTION public.the_wall_requests_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS the_wall_requests_updated_at ON public.the_wall_requests;
CREATE TRIGGER the_wall_requests_updated_at
BEFORE UPDATE ON public.the_wall_requests
FOR EACH ROW EXECUTE FUNCTION public.the_wall_requests_update_timestamp();

-- ================================================================
-- FIN DE MIGRACIÓN
-- ================================================================
-- Verificación: ejecuta estas queries para confirmar que todo está bien
-- SELECT * FROM public.the_wall_requests LIMIT 1;
-- SELECT * FROM public.the_wall_request_items LIMIT 1;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birthdate';
-- ================================================================
