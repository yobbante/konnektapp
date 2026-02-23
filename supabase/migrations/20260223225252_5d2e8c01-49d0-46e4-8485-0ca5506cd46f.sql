
-- Fix: restrict tva_records insert to authenticated users only (backend will use service role)
DROP POLICY "Service role can manage tva_records" ON public.tva_records;

-- Allow authenticated users to read their own TVA records (as client)
CREATE POLICY "Client can read own order tva" ON public.tva_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = tva_records.order_id AND o.client_id = auth.uid()
    )
  );

-- Insert only via service role (edge functions) - no direct insert from client
-- The edge functions use the service role key which bypasses RLS
