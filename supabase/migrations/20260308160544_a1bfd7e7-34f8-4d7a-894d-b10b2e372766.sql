
ALTER TABLE public.gp_profiles
  ADD COLUMN IF NOT EXISTS auto_accept_max_weight numeric DEFAULT 30,
  ADD COLUMN IF NOT EXISTS auto_accept_max_orders_per_day integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS auto_accept_require_insurance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_accept_exclude_fragile boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_accept_min_price numeric DEFAULT 0;
