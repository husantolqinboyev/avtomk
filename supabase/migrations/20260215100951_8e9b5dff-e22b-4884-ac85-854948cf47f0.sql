
-- Add device fingerprint columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pc_device_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS mobile_device_id TEXT DEFAULT NULL;
