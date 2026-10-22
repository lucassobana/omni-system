-- ============================================================
-- OMNI SYSTEM — Migration 0006: Remoção de Foto do Registro de Ponto
-- ============================================================
-- Remove a coluna photo_url da tabela work_records e limpa
-- políticas e bucket do Supabase Storage associados a fotos de ponto.
-- ============================================================

-- 1. Remover coluna photo_url de work_records
ALTER TABLE public.work_records
DROP COLUMN IF EXISTS photo_url;

-- 2. Limpar políticas de storage de fotos
DROP POLICY IF EXISTS "Permitir upload de fotos para usuários logados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura de fotos da própria org" ON storage.objects;

-- 3. Remover bucket de photos
DELETE FROM storage.buckets WHERE id = 'photos';
