-- Create documents bucket for dispute attachments (if not exists, update if exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Users can upload dispute documents to their own folder
CREATE POLICY "Users upload dispute documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own documents or if they're involved in the dispute
CREATE POLICY "Dispute parties view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (
    -- Document owner
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Admins and moderators
    public.has_admin_access(auth.uid())
  )
);

-- Users can update their own documents
CREATE POLICY "Users update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own documents
CREATE POLICY "Users delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can manage all dispute documents
CREATE POLICY "Admins manage dispute documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND
  public.has_admin_access(auth.uid())
)
WITH CHECK (
  bucket_id = 'documents' AND
  public.has_admin_access(auth.uid())
);