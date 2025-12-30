-- Add 'transporter' role to app_role enum (if not exists via expansion)
-- First, let's expand the permissions table with more granular permissions

-- Insert additional permissions for the new role system
INSERT INTO public.permissions (name, description, category) VALUES
  -- Offers
  ('offers.create', 'Créer des offres', 'offers'),
  ('offers.read', 'Voir les offres', 'offers'),
  ('offers.update', 'Modifier des offres', 'offers'),
  ('offers.delete', 'Supprimer des offres', 'offers'),
  ('offers.manage_all', 'Gérer toutes les offres', 'offers'),
  -- Orders
  ('orders.create', 'Créer des commandes', 'orders'),
  ('orders.read', 'Voir les commandes', 'orders'),
  ('orders.update', 'Modifier des commandes', 'orders'),
  ('orders.delete', 'Supprimer des commandes', 'orders'),
  ('orders.manage_all', 'Gérer toutes les commandes', 'orders'),
  -- Profiles
  ('profiles.read', 'Voir les profils', 'profiles'),
  ('profiles.update', 'Modifier les profils', 'profiles'),
  ('profiles.manage_all', 'Gérer tous les profils', 'profiles'),
  -- Alerts
  ('alerts.create', 'Créer des alertes', 'alerts'),
  ('alerts.read', 'Voir les alertes', 'alerts'),
  ('alerts.update', 'Modifier les alertes', 'alerts'),
  ('alerts.delete', 'Supprimer des alertes', 'alerts'),
  -- Favorites
  ('favorites.create', 'Créer des favoris', 'favorites'),
  ('favorites.read', 'Voir les favoris', 'favorites'),
  ('favorites.delete', 'Supprimer des favoris', 'favorites'),
  -- Tracking
  ('tracking.read', 'Voir le suivi colis', 'tracking'),
  ('tracking.update', 'Mettre à jour le suivi', 'tracking'),
  -- Dashboard
  ('dashboard.client', 'Accès tableau de bord client', 'dashboard'),
  ('dashboard.transporter', 'Accès tableau de bord transporteur', 'dashboard'),
  ('dashboard.admin', 'Accès tableau de bord admin', 'dashboard'),
  -- Users management
  ('users.read', 'Voir les utilisateurs', 'users'),
  ('users.update', 'Modifier les utilisateurs', 'users'),
  ('users.manage_roles', 'Gérer les rôles', 'users'),
  -- Disputes
  ('disputes.create', 'Ouvrir des litiges', 'disputes'),
  ('disputes.read', 'Voir les litiges', 'disputes'),
  ('disputes.arbitrate', 'Arbitrer les litiges', 'disputes')
ON CONFLICT (name) DO NOTHING;

-- Assign default permissions to admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions
WHERE name IN (
  'offers.manage_all', 'orders.manage_all', 'profiles.manage_all',
  'alerts.create', 'alerts.read', 'alerts.update', 'alerts.delete',
  'favorites.create', 'favorites.read', 'favorites.delete',
  'tracking.read', 'tracking.update',
  'dashboard.admin', 'dashboard.client', 'dashboard.transporter',
  'users.read', 'users.update', 'users.manage_roles',
  'disputes.create', 'disputes.read', 'disputes.arbitrate'
)
ON CONFLICT DO NOTHING;

-- Assign default permissions to moderator
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'moderator', id FROM public.permissions
WHERE name IN (
  'offers.read', 'offers.update',
  'orders.read', 'orders.update',
  'profiles.read', 'profiles.update',
  'tracking.read', 'tracking.update',
  'dashboard.admin',
  'users.read',
  'disputes.read', 'disputes.arbitrate'
)
ON CONFLICT DO NOTHING;

-- Assign default permissions to user (client)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'user', id FROM public.permissions
WHERE name IN (
  'offers.read',
  'orders.create', 'orders.read',
  'profiles.read', 'profiles.update',
  'alerts.create', 'alerts.read', 'alerts.update', 'alerts.delete',
  'favorites.create', 'favorites.read', 'favorites.delete',
  'tracking.read',
  'dashboard.client',
  'disputes.create', 'disputes.read'
)
ON CONFLICT DO NOTHING;

-- Create user_alerts table for managing alerts
CREATE TABLE IF NOT EXISTS public.user_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'offer', 'price', 'route', 'status'
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_alerts
CREATE POLICY "Users can create their own alerts"
ON public.user_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own alerts"
ON public.user_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.user_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.user_alerts FOR DELETE
USING (auth.uid() = user_id);

-- Create tracking_issues table for problem reporting
CREATE TABLE IF NOT EXISTS public.tracking_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL, -- 'delay', 'damage', 'lost', 'wrong_delivery', 'communication', 'other'
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracking_issues ENABLE ROW LEVEL SECURITY;

-- RLS policies for tracking_issues
CREATE POLICY "Users can create issues for their orders"
ON public.tracking_issues FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  order_id IN (SELECT id FROM public.orders WHERE client_id = auth.uid())
);

CREATE POLICY "Users can view their own issues"
ON public.tracking_issues FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own open issues"
ON public.tracking_issues FOR UPDATE
USING (auth.uid() = user_id AND status = 'open');

CREATE POLICY "Admins can view all issues"
ON public.tracking_issues FOR SELECT
USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update all issues"
ON public.tracking_issues FOR UPDATE
USING (has_admin_access(auth.uid()));

-- Add transporter favorites table (for favorite transporters)
CREATE TABLE IF NOT EXISTS public.transporter_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, gp_id)
);

-- Enable RLS
ALTER TABLE public.transporter_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for transporter_favorites
CREATE POLICY "Users can add transporter favorites"
ON public.transporter_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their transporter favorites"
ON public.transporter_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their transporter favorites"
ON public.transporter_favorites FOR DELETE
USING (auth.uid() = user_id);

-- Create function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role(
  _target_user_id UUID,
  _role app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller has permission to manage roles
  IF NOT has_permission(auth.uid(), 'users.manage_roles') THEN
    RAISE EXCEPTION 'Permission denied: users.manage_roles required';
  END IF;
  
  -- Insert or update the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_target_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Create function to remove role from user
CREATE OR REPLACE FUNCTION public.remove_user_role(
  _target_user_id UUID,
  _role app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller has permission to manage roles
  IF NOT has_permission(auth.uid(), 'users.manage_roles') THEN
    RAISE EXCEPTION 'Permission denied: users.manage_roles required';
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = _target_user_id AND role = _role;
  
  RETURN TRUE;
END;
$$;