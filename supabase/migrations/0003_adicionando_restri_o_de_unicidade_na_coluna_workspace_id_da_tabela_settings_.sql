ALTER TABLE public.settings
ADD CONSTRAINT settings_workspace_id_key UNIQUE (workspace_id);