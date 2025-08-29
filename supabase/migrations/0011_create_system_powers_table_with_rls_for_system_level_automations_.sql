-- Create system_powers table
CREATE TABLE public.system_powers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  method TEXT NOT NULL DEFAULT 'GET',
  url TEXT,
  headers JSONB DEFAULT '{}'::jsonb,
  body JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT TRUE,
  output_variable_name TEXT NOT NULL, -- Nome da variável para armazenar o resultado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.system_powers ENABLE ROW LEVEL SECURITY;

-- Policies for system_powers
-- Users can select system_powers in their workspaces
CREATE POLICY "Members can select system_powers in their workspaces" ON public.system_powers
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.workspace_members wm
  WHERE wm.workspace_id = system_powers.workspace_id AND wm.user_id = auth.uid()
));

-- Admins can manage system_powers in their workspaces
CREATE POLICY "Admins can manage system_powers in their workspaces" ON public.system_powers
FOR ALL TO authenticated
USING (
  (EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = system_powers.workspace_id AND w.created_by = auth.uid()
  )) OR (EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = system_powers.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'admin'
  ))
) WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = system_powers.workspace_id AND w.created_by = auth.uid()
  )) OR (EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.workspace_id = system_powers.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'admin'
  ))
);