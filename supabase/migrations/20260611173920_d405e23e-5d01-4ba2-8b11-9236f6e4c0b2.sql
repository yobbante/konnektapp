-- Beta flow: allow the no-auth /gp/[ref] dashboard to create its local
-- transporteurs row (identity comes from Yobbanté, beta state stays local).
CREATE POLICY "Beta anon can insert transporteurs"
  ON public.transporteurs
  FOR INSERT
  TO anon
  WITH CHECK (true);