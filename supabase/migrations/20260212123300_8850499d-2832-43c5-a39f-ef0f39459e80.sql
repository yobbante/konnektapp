
-- ═══════════════════════════════════════════
-- TABLE: manual_parcels (Colis Manuel / Hors Plateforme)
-- ═══════════════════════════════════════════
CREATE TABLE public.manual_parcels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id),
  order_number TEXT NOT NULL DEFAULT ('MP-' || substr(gen_random_uuid()::text, 1, 8)),
  
  -- Client info (not a Konnekt user necessarily)
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  
  -- Route
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  
  -- Parcel details
  weight NUMERIC NOT NULL DEFAULT 0,
  parcel_type TEXT NOT NULL DEFAULT 'kilo', -- 'kilo' or 'forfait_23kg'
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  payment_mode TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'transfer', 'unpaid'
  declared_value NUMERIC DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  
  -- Status tracking (same workflow as regular orders)
  status TEXT NOT NULL DEFAULT 'collected',
  
  -- Commission
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_deducted BOOLEAN NOT NULL DEFAULT false,
  
  -- Flags
  is_manual BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_parcels ENABLE ROW LEVEL SECURITY;

-- GPs can manage their own manual parcels
CREATE POLICY "GPs can manage their own manual parcels"
ON public.manual_parcels
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gp_profiles gp 
    WHERE gp.id = manual_parcels.gp_id 
    AND gp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM gp_profiles gp 
    WHERE gp.id = manual_parcels.gp_id 
    AND gp.user_id = auth.uid()
  )
);

-- Admins can manage all manual parcels
CREATE POLICY "Admins can manage all manual parcels"
ON public.manual_parcels
FOR ALL
USING (has_admin_access(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_parcels;

-- Trigger for updated_at
CREATE TRIGGER update_manual_parcels_updated_at
  BEFORE UPDATE ON public.manual_parcels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
