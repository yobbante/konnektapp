-- Ajouter 'agence' au type gp_type
ALTER TYPE gp_type ADD VALUE IF NOT EXISTS 'agence';

-- Ajouter 'collected' au type order_status pour le workflow complet
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'collected' AFTER 'accepted';