DROP POLICY IF EXISTS "Clients can create reviews for their orders" ON public.reviews;

CREATE POLICY "Clients can create reviews for their orders"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid()
  AND order_id IN (
    SELECT id FROM orders
    WHERE orders.client_id = auth.uid()
      AND orders.status IN ('delivery_confirmed', 'delivered', 'released')
  )
);