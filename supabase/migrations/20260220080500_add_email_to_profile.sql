-- Profile ga email field qo'shish
ALTER TABLE public.profiles ADD COLUMN email TEXT;

-- Email ni auth.users dan olish uchun trigger
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Emailni auth.users dan olish
  UPDATE public.profiles 
  SET email = (
    SELECT email FROM auth.users 
    WHERE id = NEW.user_id
  )
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger yaratish
CREATE TRIGGER sync_user_email_trigger
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();

-- Mavjud foydalanuvchilar uchun emailni yangilash
UPDATE public.profiles 
SET email = (
  SELECT email FROM auth.users 
  WHERE id = profiles.user_id
);
