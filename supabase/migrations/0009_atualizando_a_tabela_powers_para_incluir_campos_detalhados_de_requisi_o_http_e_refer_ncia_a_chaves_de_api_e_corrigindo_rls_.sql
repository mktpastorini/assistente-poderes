-- Remover colunas antigas e genéricas
ALTER TABLE public.powers
DROP COLUMN IF EXISTS request_type,
DROP COLUMN IF EXISTS endpoint_command;

-- Adicionar novas colunas para detalhes da requisição HTTP
ALTER TABLE public.powers
ADD COLUMN method TEXT NOT NULL DEFAULT 'GET', -- GET, POST, PUT, DELETE, etc.
ADD COLUMN url TEXT,
ADD COLUMN headers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN body JSONB DEFAULT '{}'::jsonb,
ADD COLUMN api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL;

-- Atualizar a política RLS de INSERT para a tabela 'powers'
-- A política atual 'powers_insert_policy' permite qualquer inserção.
-- Vamos removê-la e criar uma nova que restrinja a inserção a membros do workspace.
DROP POLICY IF EXISTS "powers_insert_policy" ON public.powers;

CREATE POLICY "Admins can insert powers in their workspaces" ON public.powers
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = powers.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'admin' -- Apenas admins podem inserir poderes
  )
);

-- Opcional: Se você quiser que qualquer membro possa inserir, use:
-- CREATE POLICY "Members can insert powers in their workspaces" ON public.powers
-- FOR INSERT TO authenticated
-- WITH CHECK (
--   EXISTS (
--     SELECT 1
--     FROM public.workspace_members wm
--     WHERE wm.workspace_id = powers.workspace_id
--       AND wm.user_id = auth.uid()
--   )
-- );