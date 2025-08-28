-- Create settings table
CREATE TABLE public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  system_prompt TEXT,
  assistant_prompt TEXT,
  ai_model TEXT DEFAULT 'openai-gpt3.5',
  voice_model TEXT DEFAULT 'browser',
  voice_sensitivity INTEGER DEFAULT 50,
  openai_api_key TEXT,
  gemini_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings table
-- Users can view settings for workspaces they are members of
CREATE POLICY "settings_select_policy" ON public.settings
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = settings.workspace_id AND wm.user_id = auth.uid()
));

-- Users can update settings for workspaces they are members of
CREATE POLICY "settings_update_policy" ON public.settings
FOR UPDATE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = settings.workspace_id AND wm.user_id = auth.uid()
));

-- Users can insert settings for workspaces they are members of (e.g., initial setup)
CREATE POLICY "settings_insert_policy" ON public.settings
FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = settings.workspace_id AND wm.user_id = auth.uid()
));

-- Users can delete settings for workspaces they are members of (if needed)
CREATE POLICY "settings_delete_policy" ON public.settings
FOR DELETE TO authenticated USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = settings.workspace_id AND wm.user_id = auth.uid()
));