
-- Add device limit and multiple device support columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pc_limit INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS mobile_limit INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS pc_device_ids TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mobile_device_ids TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing single device IDs if they exist and arrays are empty
UPDATE public.profiles
SET pc_device_ids = ARRAY[pc_device_id]
WHERE pc_device_id IS NOT NULL AND pc_device_ids = '{}';

UPDATE public.profiles
SET mobile_device_ids = ARRAY[mobile_device_id]
WHERE mobile_device_id IS NOT NULL AND mobile_device_ids = '{}';
