ALTER TABLE public.system_powers
ADD CONSTRAINT unique_workspace_id_name UNIQUE (workspace_id, name);