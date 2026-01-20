-- Create table for admin-managed flat-rate object types
CREATE TABLE public.flat_rate_object_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  default_price NUMERIC DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flat_rate_object_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read active object types
CREATE POLICY "Anyone can view active flat rate object types"
  ON public.flat_rate_object_types
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage object types
CREATE POLICY "Admins can manage flat rate object types"
  ON public.flat_rate_object_types
  FOR ALL
  USING (public.has_admin_access(auth.uid()));

-- Create table for GP flat-rate pricing
CREATE TABLE public.gp_flat_rate_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  object_type_id UUID NOT NULL REFERENCES public.flat_rate_object_types(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gp_id, object_type_id)
);

-- Enable RLS
ALTER TABLE public.gp_flat_rate_pricing ENABLE ROW LEVEL SECURITY;

-- GPs can manage their own pricing
CREATE POLICY "GPs can manage their own flat rate pricing"
  ON public.gp_flat_rate_pricing
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gp_profiles gp
      WHERE gp.id = gp_flat_rate_pricing.gp_id
      AND gp.user_id = auth.uid()
    )
  );

-- Everyone can view active GP pricing
CREATE POLICY "Anyone can view active GP flat rate pricing"
  ON public.gp_flat_rate_pricing
  FOR SELECT
  USING (is_active = true);

-- Insert default flat-rate object types
INSERT INTO public.flat_rate_object_types (name, label, default_price) VALUES
  ('telephone', 'Téléphone', 15),
  ('ordinateur', 'Ordinateur', 30),
  ('piece_auto', 'Pièce automobile', 25),
  ('document', 'Document administratif', 10),
  ('bijoux', 'Bijoux', 20),
  ('tablette', 'Tablette', 20),
  ('console', 'Console de jeux', 25),
  ('parfum', 'Parfum', 10);

-- Add explicit restrictions array to gp_offers for structured restrictions
ALTER TABLE public.gp_offers 
ADD COLUMN IF NOT EXISTS explicit_restrictions TEXT[] DEFAULT NULL;