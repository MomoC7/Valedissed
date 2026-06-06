-- ================================================================
-- VALEDISSED — SCHEMA COMPLETO (con tabla `companies` y migraciones)
-- Generado: 30-may-2026
-- ================================================================

-- ----------------------------------------------------------------
-- 0. PRELIMINARES: Extensiones necesarias (supabase/pg)
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- 1. Tabla de Perfiles (Extiende la autenticación de Supabase)
-- (Original provisto en "codigo 1")
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('cliente', 'partner', 'business', 'domiciliario', 'admin')) DEFAULT 'cliente',
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Columnas añadidas en migraciones posteriores (con checks y defaults)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male','female','other')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_type TEXT CHECK (partner_type IN ('vendedor','especialista','hibrido')),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS operation_zone TEXT,
  ADD COLUMN IF NOT EXISTS partner_product_categories TEXT[],
  ADD COLUMN IF NOT EXISTS partner_service_categories TEXT[],
  ADD COLUMN IF NOT EXISTS partner_phone TEXT,
  ADD COLUMN IF NOT EXISTS certification_url TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS id_face_url TEXT;

-- ----------------------------------------------------------------
-- 2. Tabla de Productos (Marketplace)
-- (Original provisto)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category TEXT,
  images_urls TEXT[], -- Array de links de Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campos agregados posteriormente
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('nuevo','usado')) DEFAULT 'nuevo',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  -- company_id: nueva FK opcional hacia companies (se añade más abajo cuando exista la tabla companies)
  ADD COLUMN IF NOT EXISTS company_id UUID;

-- ----------------------------------------------------------------
-- 3. Tabla de Servicios (Para Especialistas)
-- (Original provisto)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campos agregados posteriormente
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS modality TEXT CHECK (modality IN ('domicilio','estudio','ambas')) DEFAULT 'estudio',
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_images TEXT[],
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  -- company_id opcional hacia companies (se añade más abajo)
  ADD COLUMN IF NOT EXISTS company_id UUID;

-- ----------------------------------------------------------------
-- 4. The Wall (solicitudes / tablón de deseos)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.the_wall_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  product_id UUID REFERENCES public.products(id),
  message TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 5. Tabla cart_items (nuevo)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT cart_items_user_product_unique UNIQUE (user_id, product_id)
);

-- ----------------------------------------------------------------
-- 6. partner_requests (solicitudes de convertirse en partner)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    partner_type TEXT CHECK (partner_type IN ('vendedor','especialista','hibrido')) NOT NULL,
    business_name TEXT NOT NULL,
    partner_phone TEXT NOT NULL,
    operation_zone TEXT NOT NULL,
    years_experience INTEGER NOT NULL,
    bio TEXT NOT NULL,
    partner_product_categories TEXT[],
    partner_service_categories TEXT[],
    certification_url TEXT,
    id_face_url TEXT,
    status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
    admin_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para partner_requests (se definen políticas más abajo)
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 7. NUEVA: Tabla Companies (nueva entidad dedicada a empresas)
-- Diseño objetivo: cada empresa puede tener un owner (perfil), varios productos y servicios.
-- Se mantiene compatibilidad inicialmente: products/provider mantienen seller_id/provider_id, y añadimos company_id.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  phone TEXT,
  operation_zone TEXT,
  partner_type TEXT CHECK (partner_type IN ('vendedor','especialista','hibrido')),
  product_categories TEXT[],
  service_categories TEXT[],
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION public.companies_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS companies_updated_at ON public.companies;
CREATE TRIGGER companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.companies_update_timestamp();

-- ----------------------------------------------------------------
-- 8. Enlazar products/services a companies: FK y permisos
-- Nota: para compatibilidad, añadimos company_id si no existe y no alteramos seller_id/provider_id.
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_company_fk'
  ) THEN
    EXECUTE 'ALTER TABLE public.products ADD CONSTRAINT products_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_company_fk'
  ) THEN
    EXECUTE 'ALTER TABLE public.services ADD CONSTRAINT services_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL';
  END IF;
END
$$;

-- ----------------------------------------------------------------
-- 9. RLS y políticas (cart_items, products, services, partner_requests, companies)
-- ----------------------------------------------------------------

-- cart_items RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cart_items_select ON public.cart_items;
CREATE POLICY cart_items_select ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS cart_items_insert ON public.cart_items;
CREATE POLICY cart_items_insert ON public.cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cart_items_update ON public.cart_items;
CREATE POLICY cart_items_update ON public.cart_items FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS cart_items_delete ON public.cart_items;
CREATE POLICY cart_items_delete ON public.cart_items FOR DELETE USING (auth.uid() = user_id);

-- products RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS products_insert ON public.products;
CREATE POLICY products_insert ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id);
DROP POLICY IF EXISTS products_update ON public.products;
CREATE POLICY products_update ON public.products FOR UPDATE USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_delete ON public.products FOR DELETE USING (auth.uid() = seller_id);

-- services RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS services_select ON public.services;
CREATE POLICY services_select ON public.services FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS services_insert ON public.services;
CREATE POLICY services_insert ON public.services FOR INSERT WITH CHECK (auth.uid() = provider_id);
DROP POLICY IF EXISTS services_update ON public.services;
CREATE POLICY services_update ON public.services FOR UPDATE USING (auth.uid() = provider_id);
DROP POLICY IF EXISTS services_delete ON public.services;
CREATE POLICY services_delete ON public.services FOR DELETE USING (auth.uid() = provider_id);

-- partner_requests RLS (ya creado table)
DROP POLICY IF EXISTS users_read_own_requests ON public.partner_requests;
DROP POLICY IF EXISTS users_create_requests ON public.partner_requests;
DROP POLICY IF EXISTS admin_all_requests ON public.partner_requests;
CREATE POLICY users_read_own_requests ON public.partner_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY users_create_requests ON public.partner_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY admin_all_requests ON public.partner_requests FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
  )
);

-- companies RLS: permitir al owner ver/editar su empresa; admins pueden todo
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS companies_owner_select ON public.companies;
CREATE POLICY companies_owner_select ON public.companies FOR SELECT USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS companies_owner_insert ON public.companies;
CREATE POLICY companies_owner_insert ON public.companies FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS companies_owner_update ON public.companies;
CREATE POLICY companies_owner_update ON public.companies FOR UPDATE USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS companies_owner_delete ON public.companies;
CREATE POLICY companies_owner_delete ON public.companies FOR DELETE USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ----------------------------------------------------------------
-- 10. MIGRACIÓN: Crear filas en `companies` a partir de perfiles existentes
-- - Crea una empresa por cada profile que tenga business_name o partner_type (según criterio)
-- - Actualiza products.services para apuntar a companies
-- ----------------------------------------------------------------
-- Nota: revisa antes qué perfiles corresponden a empresas. Ejecutar en modo transaccional en Supabase SQL Editor.
-- ==================================================================
-- PARTE 1: DDL, POLÍTICAS Y CONFIGURACIÓN
-- Ejecuta TODO lo anterior hasta el comentario "-- === FIN PARTE 1 ===".
-- Recomendación: ejecutar PARTE 1 primero, verificar que todas las tablas
-- y políticas se crean correctamente y que no hay errores. Luego ejecutar
-- PARTE 2 (la migración de datos) que viene después.
-- ==================================================================

-- Nota: revisa antes qué perfiles corresponden a empresas. Ejecutar en modo transaccional en Supabase SQL Editor.

-- === FIN PARTE 1 ===

-- ==================================================================
-- PARTE 2: MIGRACIÓN DE DATOS (INSERTs / UPDATEs)
-- Ejecutar después de PARTE 1. Este bloque contiene la transacción que
-- crea filas en `companies` desde `profiles` y enlaza `products` y `services`.
-- ==================================================================

BEGIN;

-- 10.1 Insertar companies desde perfiles que parecen ser empresa/partner
INSERT INTO public.companies (id, owner_id, business_name, description, avatar_url, phone, operation_zone, partner_type, product_categories, service_categories, is_verified, created_at)
SELECT
  gen_random_uuid() as id,
  id as owner_id,
  COALESCE(business_name, username, CONCAT('Empresa de ', username)) as business_name,
  COALESCE(bio, '') as description,
  avatar_url,
  COALESCE(partner_phone, phone) as phone,
  operation_zone,
  partner_type,
  partner_product_categories,
  partner_service_categories,
  is_verified,
  NOW()
FROM public.profiles
WHERE (business_name IS NOT NULL AND business_name <> '')
   OR (partner_type IS NOT NULL AND partner_type <> '')
   OR (partner_product_categories IS NOT NULL AND array_length(partner_product_categories,1) > 0);

-- 10.2 Mapear products -> company (si existe company con mismo owner)
UPDATE public.products p
SET company_id = c.id
FROM public.companies c
WHERE p.seller_id = c.owner_id
  AND (p.company_id IS NULL);

-- 10.3 Mapear services -> company
UPDATE public.services s
SET company_id = c.id
FROM public.companies c
WHERE s.provider_id = c.owner_id
  AND (s.company_id IS NULL);

COMMIT;

-- ----------------------------------------------------------------
-- 11. MI GRADUAL: Opciones para producción (sugeridos)
-- 11.1 - Cambiar la lógica de la aplicación para usar company_id cuando exista
-- 11.2 - Opcionalmente, después de un período de verificación, eliminar seller_id/provider_id o dejarlos para compatibilidad
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- 12. MISC: Funciones triggers para partner_requests (actualizar timestamp)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_requests_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS partner_requests_updated_at ON public.partner_requests;
CREATE TRIGGER partner_requests_updated_at
BEFORE UPDATE ON public.partner_requests
FOR EACH ROW EXECUTE FUNCTION public.partner_requests_update_timestamp();

-- ----------------------------------------------------------------
-- FIN DEL DUMP
-- ================================================================
-- NOTA: Ejecuta este archivo en Supabase SQL Editor. HAZ UNA COPIA DE SEGURIDAD
-- ================================================================
