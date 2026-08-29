-- Caches the Fonzip OAuth2 client_credentials access token across serverless
-- invocations. Fonzip only allows one active token per client credential pair
-- at a time (a second /token request while one is still valid returns 409
-- "Token already created"), so this table lets every API route reuse the
-- same token instead of racing to mint a new one on every cold start.
CREATE TABLE fonzip_token_cache (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- No public policies: only ever accessed via the service-role client from
-- server-side API routes, which bypasses RLS entirely.
ALTER TABLE fonzip_token_cache ENABLE ROW LEVEL SECURITY;
