create or replace function public.debt_aging_replace_snapshot(p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private,auth
as $$
declare new_batch uuid;
begin
  if not private.debt_aging_accounts_access() or not private.security_ready() or not private.admin_mfa_ok() then raise exception 'not authorized'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 then raise exception 'invalid import rows'; end if;
  insert into public.debt_aging_batches(week_start,imported_by,row_count)
  values (((now() at time zone 'Asia/Riyadh')::date-(((extract(dow from (now() at time zone 'Asia/Riyadh'))::int+1)%7))::int),auth.uid(),jsonb_array_length(p_rows)) returning id into new_batch;
  insert into public.debt_aging_customers(batch_id,source_key,customer_name,area,phone,assigned_rep,opening_total,opening_overdue,weekly_required,oldest_due_date,opening_0_15,opening_16_30,opening_31_45,opening_46_60,opening_over_60)
  select new_batch,nullif(x->>'source_key',''),trim(x->>'customer_name'),nullif(trim(x->>'area'),''),nullif(trim(x->>'phone'),''),nullif(x->>'assigned_rep','')::uuid,
    (x->>'opening_total')::numeric,(x->>'opening_overdue')::numeric,coalesce(nullif(x->>'weekly_required','')::numeric,0),nullif(x->>'oldest_due_date','')::date,
    coalesce(nullif(x->>'opening_0_15','')::numeric,0),coalesce(nullif(x->>'opening_16_30','')::numeric,0),coalesce(nullif(x->>'opening_31_45','')::numeric,0),coalesce(nullif(x->>'opening_46_60','')::numeric,0),coalesce(nullif(x->>'opening_over_60','')::numeric,0)
  from jsonb_array_elements(p_rows) as r(x);
  delete from public.debt_aging_batches where id<>new_batch;
  return jsonb_build_object('batch_id',new_batch,'row_count',jsonb_array_length(p_rows));
end;
$$;
revoke all on function public.debt_aging_replace_snapshot(jsonb) from public,anon;
grant execute on function public.debt_aging_replace_snapshot(jsonb) to authenticated;
