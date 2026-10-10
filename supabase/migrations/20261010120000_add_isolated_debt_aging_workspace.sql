-- Independent debt-aging workspace. It never reads or writes sales, follow-ups, or customers.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['admin','manager','rep','accounts']::text[]));

create or replace function private.debt_aging_full_access()
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role in ('admin','manager','accounts')
  );
$$;

create or replace function private.debt_aging_accounts_access()
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role in ('admin','accounts')
  );
$$;

create or replace function private.debt_aging_rep_access()
returns boolean language sql stable security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role = 'rep'
  );
$$;

revoke all on function private.debt_aging_full_access() from public, anon;
revoke all on function private.debt_aging_accounts_access() from public, anon;
revoke all on function private.debt_aging_rep_access() from public, anon;
grant execute on function private.debt_aging_full_access() to authenticated;
grant execute on function private.debt_aging_accounts_access() to authenticated;
grant execute on function private.debt_aging_rep_access() to authenticated;

create table public.debt_aging_batches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  imported_by uuid not null references public.profiles(id),
  row_count integer not null default 0 check (row_count >= 0),
  imported_at timestamptz not null default now()
);

create table public.debt_aging_customers (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.debt_aging_batches(id) on delete cascade,
  source_key text,
  customer_name text not null check (length(trim(customer_name)) > 0),
  area text,
  phone text,
  assigned_rep uuid references public.profiles(id),
  opening_total numeric(14,2) not null check (opening_total >= 0),
  opening_overdue numeric(14,2) not null check (opening_overdue >= 0 and opening_overdue <= opening_total),
  weekly_required numeric(14,2) not null default 0 check (weekly_required >= 0),
  oldest_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index debt_aging_customers_batch_idx on public.debt_aging_customers(batch_id);
create index debt_aging_customers_rep_idx on public.debt_aging_customers(assigned_rep);

create table public.debt_aging_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.debt_aging_customers(id) on delete cascade,
  entry_type text not null check (entry_type in ('payment','cash_order')),
  amount numeric(14,2) not null check (amount > 0),
  business_date date not null default ((now() at time zone 'Asia/Riyadh')::date),
  rep_id uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);
create index debt_aging_entries_customer_date_idx on public.debt_aging_entries(customer_id,business_date);

create table public.debt_aging_requests (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles(id),
  customer_id uuid references public.debt_aging_customers(id) on delete set null,
  request_type text not null check (request_type in ('visit','issue')),
  reason text,
  audio_path text,
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  management_response text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (nullif(trim(reason),'') is not null or audio_path is not null)
);
create index debt_aging_requests_status_idx on public.debt_aging_requests(status,created_at desc);
create index debt_aging_requests_rep_idx on public.debt_aging_requests(rep_id,created_at desc);

alter table public.debt_aging_batches enable row level security;
alter table public.debt_aging_customers enable row level security;
alter table public.debt_aging_entries enable row level security;
alter table public.debt_aging_requests enable row level security;

create policy debt_aging_batches_read on public.debt_aging_batches for select to authenticated
  using (private.debt_aging_full_access());
create policy debt_aging_batches_write on public.debt_aging_batches for all to authenticated
  using (private.debt_aging_accounts_access()) with check (private.debt_aging_accounts_access());

create policy debt_aging_customers_read on public.debt_aging_customers for select to authenticated
  using (private.debt_aging_full_access() or assigned_rep = (select auth.uid()));
create policy debt_aging_customers_write on public.debt_aging_customers for all to authenticated
  using (private.debt_aging_accounts_access()) with check (private.debt_aging_accounts_access());

create policy debt_aging_entries_read on public.debt_aging_entries for select to authenticated
  using (private.debt_aging_full_access() or exists (
    select 1 from public.debt_aging_customers c
    where c.id = customer_id and c.assigned_rep = (select auth.uid())
  ));
create policy debt_aging_entries_rep_insert on public.debt_aging_entries for insert to authenticated
  with check (
    private.debt_aging_rep_access() and rep_id = (select auth.uid()) and created_by = (select auth.uid()) and
    exists (select 1 from public.debt_aging_customers c where c.id = customer_id and c.assigned_rep = (select auth.uid()))
  );
create policy debt_aging_entries_accounts_edit on public.debt_aging_entries for all to authenticated
  using (private.debt_aging_accounts_access()) with check (private.debt_aging_accounts_access());

create or replace function private.validate_debt_aging_entry()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private, auth
as $$
declare c public.debt_aging_customers%rowtype; used_total numeric; used_overdue numeric;
begin
  if private.debt_aging_accounts_access() then return new; end if;
  if not private.debt_aging_rep_access() or new.created_by <> auth.uid() or new.rep_id <> auth.uid() then
    raise exception 'not authorized';
  end if;
  select * into c from public.debt_aging_customers where id=new.customer_id for update;
  if not found or c.assigned_rep <> auth.uid() then raise exception 'customer is not assigned to this representative'; end if;
  select coalesce(sum(amount) filter(where entry_type='payment'),0),
         coalesce(sum(amount) filter(where entry_type in ('payment','cash_order')),0)
    into used_total,used_overdue from public.debt_aging_entries where customer_id=new.customer_id and (tg_op='INSERT' or id<>new.id);
  if new.entry_type='payment' and new.amount > greatest(0,c.opening_total-used_total) then
    raise exception 'payment exceeds current debt';
  end if;
  if new.entry_type='cash_order' and new.amount > greatest(0,c.opening_overdue-used_overdue) then
    raise exception 'cash order exceeds the current overdue amount';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_debt_aging_entry() from public, anon, authenticated;
create trigger validate_debt_aging_entry_before_write
  before insert or update on public.debt_aging_entries
  for each row execute function private.validate_debt_aging_entry();

create policy debt_aging_requests_read on public.debt_aging_requests for select to authenticated
  using (private.debt_aging_full_access() or rep_id = (select auth.uid()));
create policy debt_aging_requests_rep_insert on public.debt_aging_requests for insert to authenticated
  with check (private.debt_aging_rep_access() and rep_id = (select auth.uid()));
create policy debt_aging_requests_rep_edit on public.debt_aging_requests for update to authenticated
  using (private.debt_aging_rep_access() and rep_id = (select auth.uid()) and status = 'open')
  with check (rep_id = (select auth.uid()) and status = 'open');
create policy debt_aging_requests_management_edit on public.debt_aging_requests for update to authenticated
  using (private.debt_aging_full_access()) with check (private.debt_aging_full_access());

-- Managers may handle requests; only admin/accounts may change the imported ledger.
create policy debt_aging_profiles_read on public.profiles for select to authenticated
  using (private.debt_aging_full_access());

grant select, insert, update, delete on public.debt_aging_batches, public.debt_aging_customers to authenticated;
grant select, insert, update, delete on public.debt_aging_entries, public.debt_aging_requests to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace view public.debt_aging_balances with (security_invoker = true) as
select c.id, c.batch_id, c.source_key, c.customer_name, c.area, c.phone, c.assigned_rep,
       c.weekly_required, c.oldest_due_date, c.created_at,
       greatest(0, c.opening_total - coalesce(sum(e.amount) filter (where e.entry_type='payment'),0))::numeric(14,2) as current_total,
       least(greatest(0, c.opening_total - coalesce(sum(e.amount) filter (where e.entry_type='payment'),0)),
         greatest(0, c.opening_overdue - coalesce(sum(e.amount) filter (where e.entry_type in ('payment','cash_order')),0)))::numeric(14,2) as current_overdue,
       coalesce(sum(e.amount) filter (where e.entry_type in ('payment','cash_order') and e.business_date >= ((now() at time zone 'Asia/Riyadh')::date - (((extract(dow from (now() at time zone 'Asia/Riyadh'))::int + 1) % 7))::int) and e.business_date <= (now() at time zone 'Asia/Riyadh')::date),0)::numeric(14,2) as recovered_this_week,
       greatest(0, c.weekly_required - coalesce(sum(e.amount) filter (where e.entry_type in ('payment','cash_order') and e.business_date >= ((now() at time zone 'Asia/Riyadh')::date - (((extract(dow from (now() at time zone 'Asia/Riyadh'))::int + 1) % 7))::int) and e.business_date <= (now() at time zone 'Asia/Riyadh')::date),0))::numeric(14,2) as weekly_remaining
from public.debt_aging_customers c
left join public.debt_aging_entries e on e.customer_id = c.id
group by c.id;
grant select on public.debt_aging_balances to authenticated;

create or replace function public.debt_aging_replace_snapshot(p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public, private, auth
as $$
declare new_batch uuid; row_count integer;
begin
  if not private.debt_aging_accounts_access() then raise exception 'not authorized'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 then raise exception 'invalid import rows'; end if;
  insert into public.debt_aging_batches(week_start, imported_by, row_count)
  values (((now() at time zone 'Asia/Riyadh')::date - (((extract(dow from (now() at time zone 'Asia/Riyadh'))::int + 1) % 7))::int), auth.uid(), jsonb_array_length(p_rows))
  returning id into new_batch;
  insert into public.debt_aging_customers(batch_id,source_key,customer_name,area,phone,assigned_rep,opening_total,opening_overdue,weekly_required,oldest_due_date)
  select new_batch, nullif(x->>'source_key',''), trim(x->>'customer_name'), nullif(trim(x->>'area'),''), nullif(trim(x->>'phone'),''), nullif(x->>'assigned_rep','')::uuid,
         (x->>'opening_total')::numeric, (x->>'opening_overdue')::numeric, coalesce(nullif(x->>'weekly_required','')::numeric,0), nullif(x->>'oldest_due_date','')::date
  from jsonb_array_elements(p_rows) as r(x);
  delete from public.debt_aging_batches where id <> new_batch;
  get diagnostics row_count = row_count;
  return jsonb_build_object('batch_id',new_batch,'row_count',jsonb_array_length(p_rows));
end;
$$;
revoke all on function public.debt_aging_replace_snapshot(jsonb) from public, anon;
grant execute on function public.debt_aging_replace_snapshot(jsonb) to authenticated;

create or replace function private.clear_debt_aging_weekly()
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  delete from public.debt_aging_batches;
  -- Request history and audio are intentionally retained for management follow-up.
end;
$$;
revoke all on function private.clear_debt_aging_weekly() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='debt-aging-friday-reset';
    perform cron.schedule('debt-aging-friday-reset','55 20 * * 5','select private.clear_debt_aging_weekly()');
  else
    raise exception 'pg_cron is required for the Friday 23:55 Riyadh debt-aging reset';
  end if;
end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('debt-aging-requests','debt-aging-requests',false,6291456,array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav'])
on conflict (id) do update set public=false,file_size_limit=6291456,allowed_mime_types=excluded.allowed_mime_types;

create policy debt_aging_audio_insert on storage.objects for insert to authenticated
  with check (bucket_id='debt-aging-requests' and private.debt_aging_rep_access() and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy debt_aging_audio_read on storage.objects for select to authenticated
  using (bucket_id='debt-aging-requests' and (private.debt_aging_full_access() or (private.debt_aging_rep_access() and (storage.foldername(name))[1]=(select auth.uid())::text)));
