-- Create favorites table for users to save interesting offers
CREATE TABLE public.offer_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  offer_id UUID NOT NULL REFERENCES public.gp_offers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

-- Enable Row Level Security
ALTER TABLE public.offer_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.offer_favorites
FOR SELECT
USING (user_id = auth.uid());

-- Users can add their own favorites
CREATE POLICY "Users can add favorites"
ON public.offer_favorites
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can remove their own favorites
CREATE POLICY "Users can remove their own favorites"
ON public.offer_favorites
FOR DELETE
USING (user_id = auth.uid());

-- Create saved_searches table for notification preferences
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  origin_city TEXT,
  destination_city TEXT,
  transport_type TEXT,
  min_price INTEGER,
  max_price INTEGER,
  min_weight NUMERIC,
  notify_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can manage their own saved searches
CREATE POLICY "Users can view their saved searches"
ON public.saved_searches FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create saved searches"
ON public.saved_searches FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their saved searches"
ON public.saved_searches FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their saved searches"
ON public.saved_searches FOR DELETE USING (user_id = auth.uid());