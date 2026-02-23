
-- TVA Records table for fiscal tracking
-- TVA is extracted FROM the commission (18/118 of commission_amount)
CREATE TABLE public.tva_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  commission_amount_fcfa NUMERIC NOT NULL DEFAULT 0,
  tva_amount_fcfa NUMERIC NOT NULL DEFAULT 0,
  tva_rate NUMERIC NOT NULL DEFAULT 18,
  commission_ht_fcfa NUMERIC NOT NULL DEFAULT 0,
  currency_display TEXT NOT NULL DEFAULT 'XOF',
  tva_amount_display NUMERIC NOT NULL DEFAULT 0,
  commission_ht_display NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_tva_per_order UNIQUE (order_id)
);

-- Enable RLS
ALTER TABLE public.tva_records ENABLE ROW LEVEL SECURITY;

-- Admin can read all
CREATE POLICY "Admins can read all tva_records" ON public.tva_records
  FOR SELECT USING (public.has_admin_access(auth.uid()));

-- GP can read their own orders' TVA
CREATE POLICY "GP can read own order tva" ON public.tva_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.gp_profiles gp ON o.gp_id = gp.id
      WHERE o.id = tva_records.order_id AND gp.user_id = auth.uid()
    )
  );

-- Service role can insert
CREATE POLICY "Service role can manage tva_records" ON public.tva_records
  FOR ALL USING (true) WITH CHECK (true);
