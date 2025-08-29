-- This policy allows any visitor (including non-logged-in users) to read the settings.
-- This is necessary for the voice assistant on the main page to function for everyone.
-- Note: Update, Insert, and Delete permissions remain restricted to authenticated users.
CREATE POLICY "Public read access to settings" ON public.settings
FOR SELECT USING (true);