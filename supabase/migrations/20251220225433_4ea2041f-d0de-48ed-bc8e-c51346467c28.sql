-- Fix security warnings: Add explicit anonymous protection and conversations UPDATE policy

-- 1. Add explicit policy to block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 2. Add UPDATE policy for conversations table - only participants can update
CREATE POLICY "Participants can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  client_id = auth.uid() 
  OR gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  client_id = auth.uid() 
  OR gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
);