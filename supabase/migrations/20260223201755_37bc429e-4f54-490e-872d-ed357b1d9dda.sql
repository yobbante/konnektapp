-- Allow authenticated users to search profiles (for recipient lookup)
CREATE POLICY "Authenticated users can search profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);