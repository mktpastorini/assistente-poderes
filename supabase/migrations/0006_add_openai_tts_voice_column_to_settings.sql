-- Adiciona coluna openai_tts_voice na tabela settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS openai_tts_voice text;

-- Garantir que a coluna aceita valores nulos
ALTER TABLE public.settings
ALTER COLUMN openai_tts_voice DROP NOT NULL;

-- RLS policies já existentes para settings devem cobrir essa coluna, mas vamos garantir que a tabela está com RLS habilitado
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- As policies existentes para SELECT, INSERT, UPDATE e DELETE devem continuar válidas
-- Caso precise, aqui está um exemplo para UPDATE (ajuste conforme sua política atual):

-- CREATE POLICY "settings_update_policy" ON public.settings
-- FOR UPDATE TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM workspace_members wm
--     WHERE wm.workspace_id = settings.workspace_id
--       AND wm.user_id = auth.uid()
--   )
-- );

-- Não é necessário criar nova policy só para essa coluna, pois ela está dentro da tabela settings