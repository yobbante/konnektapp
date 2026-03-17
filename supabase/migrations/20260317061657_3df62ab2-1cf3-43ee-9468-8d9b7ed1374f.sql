-- Fix: Allow conversation participants to mark messages as read (update read_at)
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Allow sender to update own messages OR conversation participant to update read_at
CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
TO public
USING (
  conversation_id IN (
    SELECT conversations.id
    FROM conversations
    WHERE conversations.client_id = auth.uid()
       OR conversations.gp_id IN (
         SELECT gp_profiles.id FROM gp_profiles WHERE gp_profiles.user_id = auth.uid()
       )
  )
)
WITH CHECK (
  conversation_id IN (
    SELECT conversations.id
    FROM conversations
    WHERE conversations.client_id = auth.uid()
       OR conversations.gp_id IN (
         SELECT gp_profiles.id FROM gp_profiles WHERE gp_profiles.user_id = auth.uid()
       )
  )
);