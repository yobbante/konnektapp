
-- 1. Add provider_type to mobility_profiles (particulier vs agence)
ALTER TABLE public.mobility_profiles 
ADD COLUMN IF NOT EXISTS provider_type text NOT NULL DEFAULT 'particulier';

-- 2. Add transport_license_url for agencies
ALTER TABLE public.mobility_profiles 
ADD COLUMN IF NOT EXISTS transport_license_url text;

-- 3. Create shuttle routes table for agencies (recurring fixed routes)
CREATE TABLE IF NOT EXISTS public.mobility_shuttle_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobility_profile_id uuid NOT NULL REFERENCES public.mobility_profiles(id) ON DELETE CASCADE,
  origin_city text NOT NULL,
  origin_country text NOT NULL DEFAULT 'SN',
  destination_city text NOT NULL,
  destination_country text NOT NULL DEFAULT 'SN',
  departure_time time NOT NULL,
  price_per_seat numeric NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  total_seats integer NOT NULL DEFAULT 4,
  days_of_week integer[] DEFAULT '{1,2,3,4,5}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.mobility_shuttle_routes ENABLE ROW LEVEL SECURITY;

-- 5. RLS: owners can manage their routes
CREATE POLICY "Mobility owners can manage shuttle routes"
ON public.mobility_shuttle_routes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mobility_profiles mp 
    WHERE mp.id = mobility_profile_id AND mp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mobility_profiles mp 
    WHERE mp.id = mobility_profile_id AND mp.user_id = auth.uid()
  )
);

-- 6. RLS: anyone can read active routes
CREATE POLICY "Anyone can view active shuttle routes"
ON public.mobility_shuttle_routes
FOR SELECT
TO anon, authenticated
USING (is_active = true);
