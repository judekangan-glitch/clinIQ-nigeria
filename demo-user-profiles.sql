-- Optional SQL for creating profile rows for demo users after their Supabase Auth users exist.
-- Run this in the Supabase SQL editor.

INSERT INTO public.users (id, full_name, role)
VALUES
  ('a225c2f7-ca49-4de1-b709-5c05130c4cab', 'Demo CHEW', 'chew')
ON CONFLICT (id) DO NOTHING;

-- Example for a second demo doctor account once you know its auth user ID:
-- INSERT INTO public.users (id, full_name, role)
-- VALUES ('<doctor-auth-user-id>', 'Demo Doctor', 'doctor')
-- ON CONFLICT (id) DO NOTHING;
