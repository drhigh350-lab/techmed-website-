-- Server-only key storage (e.g. the private key that unseals quiz/class links
-- typed into Sanity). RLS on with NO policies: only the service role (server
-- functions) can read or write it; never reachable with the public key.
CREATE TABLE IF NOT EXISTS public.app_secrets (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_secrets FROM anon, authenticated;
