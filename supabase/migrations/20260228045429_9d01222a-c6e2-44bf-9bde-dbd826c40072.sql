-- Add structured evaluation fields to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS criteria_punctuality boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS criteria_communication boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS criteria_packaging boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS criteria_condition boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS criteria_professionalism boolean DEFAULT false;

-- Enable realtime on notifications and reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;
END $$;