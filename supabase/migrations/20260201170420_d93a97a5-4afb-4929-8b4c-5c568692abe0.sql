-- V1.1 Logistique Interne: Add columns for "arrived" status and GP arrival tracking
-- These columns enable the GP "arrived" status workflow

-- Add logistics_status to track the overall internal logistics state
ALTER TABLE public.order_logistics_options 
ADD COLUMN IF NOT EXISTS logistics_status TEXT DEFAULT NULL;

-- Add gp_arrived_at to track when GP marked the package as arrived
ALTER TABLE public.order_logistics_options 
ADD COLUMN IF NOT EXISTS gp_arrived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for filtering by logistics status
CREATE INDEX IF NOT EXISTS idx_order_logistics_options_logistics_status 
ON public.order_logistics_options(logistics_status) 
WHERE logistics_status IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.order_logistics_options.logistics_status IS 'V1.1 - Overall logistics workflow status: awaiting_admin_delivery, admin_delivering, completed';
COMMENT ON COLUMN public.order_logistics_options.gp_arrived_at IS 'V1.1 - Timestamp when GP marked the package as arrived at destination';