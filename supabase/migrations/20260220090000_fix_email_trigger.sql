-- TUZATMA: auth.users triggerini o'chiramiz (login 500 xatosi sababi)
-- Bu trigger login paytida crash qilgan edi

DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.sync_user_email();

-- To'g'ri trigger: public.profiles ga INSERT bo'lganda ishlaydi (auth.users emas)
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Yangi profile qo'shilganda emailni to'ldirish
  NEW.email := (
    SELECT email FROM auth.users
    WHERE id = NEW.user_id
  );
  RETURN NEW;
END;
$$;

-- Trigger endi profiles jadvaliga biriktirilgan (auth.users ga emas!)
CREATE TRIGGER sync_user_email_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
WHEN (NEW.email IS NULL)
EXECUTE FUNCTION public.sync_user_email();

-- Mavjud foydalanuvchilar uchun emailni yangilash (xavfsiz)
UPDATE public.profiles
SET email = (
  SELECT email FROM auth.users
  WHERE id = profiles.user_id
)
WHERE email IS NULL;
