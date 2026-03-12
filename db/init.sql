CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  attempts INT NOT NULL DEFAULT 0,
  error TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
