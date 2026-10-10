create or replace function public.debt_aging_save_request_audio(p_request_id uuid,p_content_type text,p_audio_base64 text)
returns void language plpgsql security invoker set search_path=pg_catalog,public,private,auth
as $$
declare raw_audio bytea;
begin
  if not private.security_ready() or not private.admin_mfa_ok() or not private.debt_aging_rep_access() then raise exception 'not authorized'; end if;
  if p_content_type not in ('audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav') then raise exception 'unsupported audio type'; end if;
  if p_audio_base64 is null or length(p_audio_base64)>8388608 then raise exception 'audio is too large'; end if;
  raw_audio:=decode(p_audio_base64,'base64');
  if octet_length(raw_audio)>6291456 then raise exception 'audio is too large'; end if;
  insert into public.debt_aging_request_audio(request_id,content_type,audio_data)
  select r.id,p_content_type,raw_audio from public.debt_aging_requests r
  where r.id=p_request_id and r.rep_id=auth.uid() and r.status='open' and r.audio_path='db:'||r.id::text
  on conflict(request_id) do update set content_type=excluded.content_type,audio_data=excluded.audio_data,created_at=now();
  if not found then raise exception 'request not found'; end if;
end;
$$;
revoke all on function public.debt_aging_save_request_audio(uuid,text,text) from public,anon;
grant execute on function public.debt_aging_save_request_audio(uuid,text,text) to authenticated;

create or replace function public.debt_aging_get_request_audio(p_request_id uuid)
returns table(content_type text,audio_base64 text)
language sql stable security invoker set search_path=pg_catalog,public,private,auth
as $$
  select a.content_type,encode(a.audio_data,'base64')
  from public.debt_aging_request_audio a join public.debt_aging_requests r on r.id=a.request_id
  where a.request_id=p_request_id and private.security_ready() and private.admin_mfa_ok()
    and (private.debt_aging_full_access() or r.rep_id=auth.uid());
$$;
revoke all on function public.debt_aging_get_request_audio(uuid) from public,anon;
grant execute on function public.debt_aging_get_request_audio(uuid) to authenticated;

create or replace function private.clear_debt_aging_weekly()
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
begin
  delete from public.debt_aging_requests;
  delete from public.debt_aging_batches;
end;
$$;
revoke all on function private.clear_debt_aging_weekly() from public,anon,authenticated;
