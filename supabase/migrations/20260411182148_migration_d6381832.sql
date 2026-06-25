-- Job Board Tables
CREATE TABLE IF NOT EXISTS job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  job_type TEXT CHECK (job_type IN ('full_time', 'part_time', 'contract', 'internship')),
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead')),
  salary_range TEXT,
  description TEXT NOT NULL,
  requirements TEXT,
  benefits TEXT,
  posted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  application_deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'accepted')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS job_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referee_email TEXT NOT NULL,
  referee_name TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'applied', 'hired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for job_postings
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active jobs" ON job_postings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create jobs" ON job_postings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Job posters can update their jobs" ON job_postings
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Job posters can delete their jobs" ON job_postings
  FOR DELETE USING (auth.uid() = posted_by);

-- RLS Policies for job_applications
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view their own applications" ON job_applications
  FOR SELECT USING (auth.uid() = applicant_id);

CREATE POLICY "Job posters can view applications to their jobs" ON job_applications
  FOR SELECT USING (
    auth.uid() IN (
      SELECT posted_by FROM job_postings WHERE id = job_applications.job_id
    )
  );

CREATE POLICY "Authenticated users can apply to jobs" ON job_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicants can update their applications" ON job_applications
  FOR UPDATE USING (auth.uid() = applicant_id);

-- RLS Policies for job_referrals
ALTER TABLE job_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrers can view their referrals" ON job_referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Authenticated users can create referrals" ON job_referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_postings_posted_by ON job_postings(posted_by);
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON job_postings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_referrals_job ON job_referrals(job_id);