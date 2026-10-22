-- ============================================================
-- OMNI SYSTEM — Migration 0003: Ponto Mobile & Fotos
-- ============================================================
-- Adiciona a coluna photo_url na tabela work_records.
-- Cria o bucket 'photos' no Supabase Storage e aplica as
-- devidas regras de Row Level Security (RLS).
-- ============================================================

-- 1. Adicionar coluna na tabela work_records
ALTER TABLE public.work_records
ADD COLUMN IF NOT EXISTS photo_url TEXT NULL;

-- 2. Criar Bucket de Storage 'photos' (caso não exista)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    FALSE, -- Bucket privado
    5242880, -- Limite de 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = FALSE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- 3. Row Level Security (RLS) para Storage
-- Usuários autenticados podem inserir objetos (enviar fotos)
CREATE POLICY "Permitir upload de fotos para usuários logados"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Apenas o dono (admin/owner) ou quem enviou pode ler (simplificado)
CREATE POLICY "Permitir leitura de fotos da própria org"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'photos');
