-- Create permissions table for granular access control
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for permissions (read-only for authenticated users)
CREATE POLICY "Permissions readable by authenticated users"
ON public.permissions FOR SELECT
TO authenticated
USING (true);

-- RLS policies for role_permissions (read-only for authenticated users)
CREATE POLICY "Role permissions readable by authenticated users"
ON public.role_permissions FOR SELECT
TO authenticated
USING (true);

-- Admin only write policies
CREATE POLICY "Admins can manage permissions"
ON public.permissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
-- Admin permissions
('admin.users.view', 'Voir tous les utilisateurs', 'admin'),
('admin.users.manage', 'Gérer les utilisateurs', 'admin'),
('admin.gp.verify', 'Vérifier les transporteurs', 'admin'),
('admin.gp.suspend', 'Suspendre les transporteurs', 'admin'),
('admin.orders.view', 'Voir toutes les commandes', 'admin'),
('admin.disputes.manage', 'Gérer les litiges', 'admin'),
('admin.settings.manage', 'Gérer les paramètres système', 'admin'),

-- Moderator permissions
('mod.gp.review', 'Examiner les profils transporteurs', 'moderator'),
('mod.disputes.view', 'Voir les litiges', 'moderator'),
('mod.disputes.respond', 'Répondre aux litiges', 'moderator'),
('mod.support.manage', 'Gérer le support client', 'moderator'),

-- Transporter permissions
('transporter.offers.create', 'Créer des offres', 'transporter'),
('transporter.offers.manage', 'Gérer ses offres', 'transporter'),
('transporter.orders.view', 'Voir ses commandes', 'transporter'),
('transporter.orders.update', 'Mettre à jour ses commandes', 'transporter'),
('transporter.wallet.view', 'Voir son portefeuille', 'transporter'),
('transporter.wallet.withdraw', 'Retirer des fonds', 'transporter'),

-- Client permissions
('client.offers.view', 'Voir les offres', 'client'),
('client.orders.create', 'Créer des commandes', 'client'),
('client.orders.view', 'Voir ses commandes', 'client'),
('client.disputes.create', 'Ouvrir un litige', 'client'),
('client.messages.send', 'Envoyer des messages', 'client');

-- Assign permissions to roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'moderator', id FROM public.permissions 
WHERE category IN ('moderator', 'client');

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'user', id FROM public.permissions 
WHERE category = 'client';

-- Create function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.name = _permission
  )
$$;

-- Create typing_indicators table for real-time chat
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('client', 'gp')),
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for typing_indicators
CREATE POLICY "Users can view typing indicators for their conversations"
ON public.typing_indicators FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.client_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.gp_profiles gp WHERE gp.id = c.gp_id AND gp.user_id = auth.uid()))
  )
);

CREATE POLICY "Users can update their own typing indicator"
ON public.typing_indicators FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own typing status"
ON public.typing_indicators FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own typing indicator"
ON public.typing_indicators FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for typing_indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;