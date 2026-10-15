-- Additive metadata for the optional interface trial; no financial records change.
BEGIN;
CREATE TABLE IF NOT EXISTS public.interface_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id bigint NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
  page_path text NOT NULL CHECK (length(page_path) <= 200 AND (page_path = '/new' OR page_path LIKE '/new/%')),
  kind text NOT NULL CHECK (kind IN ('suggestion', 'problem', 'missing', 'positive')),
  comment text NOT NULL CHECK (length(trim(comment)) BETWEEN 5 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interface_feedback_created_at_idx ON public.interface_feedback(created_at DESC);
ALTER TABLE public.interface_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.interface_feedback FROM anon;
GRANT SELECT, INSERT ON public.interface_feedback TO authenticated;
GRANT ALL ON public.interface_feedback TO service_role;
DROP POLICY IF EXISTS "Users can submit interface feedback" ON public.interface_feedback;
CREATE POLICY "Users can submit interface feedback" ON public.interface_feedback FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND (
  EXISTS (SELECT 1 FROM public.account_users au WHERE au.account_id = interface_feedback.account_id AND au.user_id = auth.uid() AND au.status = 'active')
  OR EXISTS (SELECT 1 FROM public.budget_accounts ba WHERE ba.id = interface_feedback.account_id AND ba.owner_id = auth.uid() AND ba.deleted_at IS NULL)
));
DROP POLICY IF EXISTS "Users can read their interface feedback" ON public.interface_feedback;
CREATE POLICY "Users can read their interface feedback" ON public.interface_feedback FOR SELECT TO authenticated USING (user_id = auth.uid());
COMMIT;
