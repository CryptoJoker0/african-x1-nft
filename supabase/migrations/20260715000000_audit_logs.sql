-- Create audit_logs table for mint and marketplace error tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action       text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type  text,
  entity_id    text,
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write audit logs
GRANT ALL ON public.audit_logs TO service_role;

-- Admins can read audit logs
CREATE POLICY "audit_logs_admin_read"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
