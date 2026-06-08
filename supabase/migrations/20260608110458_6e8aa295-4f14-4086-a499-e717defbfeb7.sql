GRANT SELECT ON public.transporteurs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transporteurs TO authenticated;
GRANT ALL ON public.transporteurs TO service_role;
NOTIFY pgrst, 'reload schema';