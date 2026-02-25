-- Allow recipients to read orders addressed to them
CREATE POLICY "orders_recipient_select"
  ON public.orders
  FOR SELECT
  USING (recipient_user_id = auth.uid());