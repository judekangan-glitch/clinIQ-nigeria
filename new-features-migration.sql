-- ClinIQ Nigeria — New Table Migrations
-- Copy this ENTIRE file and paste it into Supabase SQL Editor as ONE query, then click Run.

-- ========================================================
-- 0. CLEAN SLATE — Drop tables if they already exist
-- ========================================================
DROP TABLE IF EXISTS public.learning_quiz_results CASCADE;
DROP TABLE IF EXISTS public.mch_records CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;

-- ========================================================
-- 1. REFERRALS TABLE
-- ========================================================
CREATE TABLE public.referrals (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id        UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  consultation_id   UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  chew_id           UUID REFERENCES public.users(id),
  phc_id            UUID,
  reason            TEXT NOT NULL,
  receiving_facility TEXT NOT NULL,
  urgency           TEXT DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
  clinical_summary  TEXT,
  drugs_sent_with   TEXT,
  escort_required   BOOLEAN DEFAULT FALSE,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'completed', 'cancelled')),
  referred_at       TIMESTAMPTZ DEFAULT NOW(),
  received_at       TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CHEWs can insert referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = chew_id);

CREATE POLICY "Authenticated users can view referrals" ON public.referrals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "CHEWs can update their own referrals" ON public.referrals
  FOR UPDATE USING (auth.uid() = chew_id);


-- ========================================================
-- 2. MCH RECORDS TABLE (ANC + Immunisation)
-- ========================================================
CREATE TABLE public.mch_records (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id        UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  chew_id           UUID REFERENCES public.users(id),
  phc_id            UUID,
  record_type       TEXT NOT NULL CHECK (record_type IN ('anc', 'immunisation')),
  lmp_date          DATE,
  gravida           INTEGER,
  para              INTEGER,
  anc_contacts      JSONB,
  vaccine_records   JSONB,
  notes             TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, record_type)
);

ALTER TABLE public.mch_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CHEWs can manage MCH records" ON public.mch_records
  FOR ALL USING (auth.role() = 'authenticated');


-- ========================================================
-- 3. ADD consent_given_at TO patients TABLE
-- ========================================================
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;


-- ========================================================
-- 4. LEARNING QUIZ RESULTS TABLE
-- ========================================================
CREATE TABLE public.learning_quiz_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chew_id       UUID REFERENCES public.users(id),
  module_id     TEXT NOT NULL,
  score         INTEGER NOT NULL,
  total         INTEGER NOT NULL,
  passed        BOOLEAN GENERATED ALWAYS AS (score::float / total >= 0.7) STORED,
  taken_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.learning_quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their quiz results" ON public.learning_quiz_results
  FOR ALL USING (auth.uid() = chew_id);


-- ========================================================
-- 5. INDEXES for performance
-- ========================================================
CREATE INDEX idx_referrals_patient ON public.referrals(patient_id);
CREATE INDEX idx_referrals_chew ON public.referrals(chew_id);
CREATE INDEX idx_mch_patient ON public.mch_records(patient_id);
CREATE INDEX idx_quiz_chew ON public.learning_quiz_results(chew_id);
