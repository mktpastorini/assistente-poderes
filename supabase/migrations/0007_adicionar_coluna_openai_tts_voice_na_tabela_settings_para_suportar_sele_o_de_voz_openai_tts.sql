ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS openai_tts_voice text;

ALTER TABLE public.settings
ALTER COLUMN openai_tts_voice DROP NOT NULL;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;