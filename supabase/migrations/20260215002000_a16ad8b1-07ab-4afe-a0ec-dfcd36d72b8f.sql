
-- Add columns to scan_logs for unified engine
ALTER TABLE public.scan_logs 
  ADD COLUMN IF NOT EXISTS qr_type text,
  ADD COLUMN IF NOT EXISTS reference_id uuid,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS engine_status text DEFAULT 'executed',
  ADD COLUMN IF NOT EXISTS financial_impact jsonb,
  ADD COLUMN IF NOT EXISTS signature_valid boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Make order_id nullable (not all scans are order-related)
ALTER TABLE public.scan_logs ALTER COLUMN order_id DROP NOT NULL;

-- Add index for idempotency and performance
CREATE INDEX IF NOT EXISTS idx_scan_logs_idempotency ON public.scan_logs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scan_logs_qr_type ON public.scan_logs(qr_type);
CREATE INDEX IF NOT EXISTS idx_scan_logs_user_created ON public.scan_logs(user_id, created_at DESC);

-- Rate limit: index for per-user per-minute queries
CREATE INDEX IF NOT EXISTS idx_scan_logs_rate_limit ON public.scan_logs(user_id, created_at);
