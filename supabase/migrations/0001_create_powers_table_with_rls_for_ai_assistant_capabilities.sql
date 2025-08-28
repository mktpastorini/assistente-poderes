-- Create powers table
CREATE TABLE public.powers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  request_type TEXT, -- e.g., 'GET', 'POST', 'cURL', 'JSON'
  endpoint_command TEXT, -- URL, cURL command, or JSON structure
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.powers ENABLE ROW LEVEL SECURITY;

-- Policies for powers table
-- Users can view powers for workspaces they are members of
CREATE POLICY "powers_select_policy" ON public.powers
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = powers.workspace_id AND wm.user_id = auth.uid()
));

-- Users can insert powers for workspaces they are members of
CREATE POLICY "powers_insert_policy" ON public.powers
FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = powers.workspace_id AND wm.user_id = auth.uid()
));

-- Users can update powers for workspaces they are members of
CREATE POLICY "powers_update_policy" ON public.powers
FOR UPDATE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = powers.workspace_id AND wm.user_id = auth.uid()
));

-- Users can delete powers for workspaces they are members of
CREATE POLICY "powers_delete_policy" ON public.powers
FOR DELETE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = powers.workspace_id AND wm.user_id = auth.uid()
));