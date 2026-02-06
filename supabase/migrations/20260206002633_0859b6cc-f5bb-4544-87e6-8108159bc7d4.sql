
-- Step 1: Add agent_logistique to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'agent_logistique';
