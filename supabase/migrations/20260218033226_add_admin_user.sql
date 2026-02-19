-- Add admin role for user samandar@avto.uz
INSERT INTO public.user_roles (user_id, role) 
VALUES ('809e436d-e4a3-4b95-a05a-1e972bdb5e9f', 'admin')
ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';

