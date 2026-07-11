-- Supabase Row Level Security helpers for demo mode.
-- Run this in the Supabase SQL editor for your project.

-- Enable RLS if not already enabled.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to access the users table for their own profile.
CREATE POLICY "Authenticated users can read their profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert their own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update their own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to manage patients in demo mode.
CREATE POLICY "Authenticated users can read patients" ON public.patients
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert patients" ON public.patients
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update patients" ON public.patients
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete patients" ON public.patients
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage consultations in demo mode.
CREATE POLICY "Authenticated users can read consultations" ON public.consultations
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert consultations" ON public.consultations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update consultations" ON public.consultations
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete consultations" ON public.consultations
  FOR DELETE
  USING (auth.role() = 'authenticated');
