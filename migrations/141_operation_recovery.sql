BEGIN;
CREATE FUNCTION public.resolve_budget_operation(p_budget_id bigint,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE receipt public.budget_operations;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 SELECT * INTO receipt FROM public.budget_operations WHERE account_id=p_budget_id AND operation_id=p_operation_id;
 IF FOUND THEN
  IF receipt.user_id<>auth.uid() THEN RAISE EXCEPTION 'This operation belongs to another user.' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('status',CASE WHEN receipt.command='{"canceled":true}'::jsonb THEN 'canceled' ELSE 'committed' END);
 END IF;
 -- Fence a delayed original request: it cannot commit after we report no change.
 INSERT INTO public.budget_operations(account_id,operation_id,user_id,command,result)
 VALUES(p_budget_id,p_operation_id,auth.uid(),'{"canceled":true}','{}');
 RETURN jsonb_build_object('status','canceled');
END $$;
REVOKE ALL ON FUNCTION public.resolve_budget_operation(bigint,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_budget_operation(bigint,uuid) TO authenticated;
COMMIT;
