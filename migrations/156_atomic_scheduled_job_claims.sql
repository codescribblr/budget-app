-- Compatible pre-deploy change. Existing rows are preserved; expired work is
-- marked failed for review instead of automatically repeating external effects.
BEGIN;
ALTER TABLE public.scheduled_jobs ADD COLUMN IF NOT EXISTS lease_token uuid;
ALTER TABLE public.scheduled_jobs ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;
ALTER TABLE public.scheduled_jobs ADD COLUMN IF NOT EXISTS failure_reviewed_at timestamptz;
ALTER TABLE public.scheduled_jobs ADD COLUMN IF NOT EXISTS attempt integer NOT NULL DEFAULT 0;
-- Fail for review if legacy data contains multiple active rows of one job type.
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_jobs_one_active_type ON public.scheduled_jobs(job_type) WHERE status IN ('pending','running');

CREATE OR REPLACE FUNCTION public.claim_scheduled_job(p_job_id bigint, p_token uuid)
RETURNS SETOF public.scheduled_jobs LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 UPDATE public.scheduled_jobs SET status='running', started_at=now(), completed_at=NULL,
   error_message=NULL, lease_token=p_token, lease_expires_at=now()+interval '15 minutes', attempt=attempt+1
 WHERE id=p_job_id AND status='pending' AND scheduled_for<=now() AND p_token IS NOT NULL
 RETURNING *;
$$;
CREATE OR REPLACE FUNCTION public.renew_scheduled_job(p_job_id bigint, p_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
 UPDATE public.scheduled_jobs SET lease_expires_at=now()+interval '15 minutes'
 WHERE id=p_job_id AND status='running' AND lease_token=p_token AND lease_expires_at>now();
 RETURN FOUND;
END;
$$;
CREATE OR REPLACE FUNCTION public.finish_scheduled_job(p_job_id bigint, p_token uuid, p_success boolean, p_message text, p_next_run timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE finished public.scheduled_jobs;
BEGIN
 IF p_success IS NULL THEN RAISE EXCEPTION 'Completion outcome required'; END IF;
 IF p_next_run IS NOT NULL AND p_next_run<=now() THEN RAISE EXCEPTION 'Next run must be in the future'; END IF;
 UPDATE public.scheduled_jobs SET
   status=CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
   completed_at=now(),
   error_message=CASE WHEN p_success THEN NULL ELSE left(p_message,1000) END,
   metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('lastMessage',left(p_message,1000),'lastRunSucceeded',p_success),
   lease_token=NULL,lease_expires_at=NULL
 WHERE id=p_job_id AND status='running' AND lease_token=p_token AND lease_expires_at>now() RETURNING * INTO finished;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_success AND p_next_run IS NOT NULL THEN
  INSERT INTO public.scheduled_jobs(job_type,status,scheduled_for,metadata)
  VALUES(finished.job_type,'pending',p_next_run,finished.metadata - 'lastMessage' - 'lastRunSucceeded');
 END IF;
 RETURN true;
END;
$$;
CREATE OR REPLACE FUNCTION public.expire_scheduled_job_leases()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE expired integer;
BEGIN
 UPDATE public.scheduled_jobs SET status='failed',completed_at=now(),lease_token=NULL,lease_expires_at=NULL,
   error_message='Worker lease expired. Review external effects before rescheduling.'
 WHERE status='running' AND (lease_expires_at<now() OR (lease_token IS NULL AND started_at<now()-interval '1 hour'));
 GET DIAGNOSTICS expired=ROW_COUNT;
 RETURN expired;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_scheduled_job(bigint,uuid), public.renew_scheduled_job(bigint,uuid), public.finish_scheduled_job(bigint,uuid,boolean,text,timestamptz), public.expire_scheduled_job_leases() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_scheduled_job(bigint,uuid), public.renew_scheduled_job(bigint,uuid), public.finish_scheduled_job(bigint,uuid,boolean,text,timestamptz), public.expire_scheduled_job_leases() TO service_role;
COMMIT;
