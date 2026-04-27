UPDATE public.app_lock_settings
SET bypass_paths = ARRAY['/t','/auth','/admin','/reset-password','/transporteur','/gp','/routier','/aerien','/maritime']
WHERE singleton = true;