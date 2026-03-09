-- Add photo_urls column to routier_missions
ALTER TABLE public.routier_missions ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

-- Create storage bucket for mission photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-photos', 'mission-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to mission-photos bucket
CREATE POLICY "Authenticated users can upload mission photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mission-photos');

-- Allow public read access
CREATE POLICY "Public read access to mission photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mission-photos');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own mission photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mission-photos' AND (storage.foldername(name))[1] = auth.uid()::text);