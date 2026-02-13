-- Clean up duplicate phone numbers: keep only the most recent profile per phone
-- Set older duplicates to NULL
UPDATE public.profiles p
SET phone = NULL
WHERE phone IS NOT NULL 
  AND phone != ''
  AND id != (
    SELECT id FROM public.profiles p2 
    WHERE p2.phone = p.phone 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Now add unique constraint on phone (partial: allows NULLs)
CREATE UNIQUE INDEX profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL AND phone != '';
